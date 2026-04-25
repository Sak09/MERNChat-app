import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import { Message, MessageState, PendingMessage } from '../../types';
import { savePendingMessage, removePendingMessage, getPendingMessages } from '../../lib/indexedDB';
import { v4 as uuidv4 } from 'uuid';

// Re-export uuid for use in components
export { v4 as uuidv4 } from 'uuid';

const initialState: MessageState = {
  byConversation: {},
  cursors: {},
  hasMore: {},
  isLoading: {},
  pendingMessages: [],
};

// Fetch paginated messages
export const fetchMessages = createAsyncThunk(
  'messages/fetch',
  async ({ conversationId, cursor }: { conversationId: string; cursor?: string }, { rejectWithValue }) => {
    try {
      const params = cursor ? { cursor } : {};
      const { data } = await api.get(`/conversations/${conversationId}/messages`, { params });
      return { conversationId, ...data };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

// Send message (with optimistic update + offline queue)
export const sendMessage = createAsyncThunk(
  'messages/send',
  async (
    { conversationId, content, type = 'text', replyTo, currentUser }: {
      conversationId: string; content: string; type?: string; replyTo?: string; currentUser: any;
    },
    { rejectWithValue, dispatch }
  ) => {
    const clientId = uuidv4();
    const optimisticMsg: Message = {
      _id: clientId,
      conversationId,
      sender: currentUser,
      content,
      type: type as any,
      status: 'pending',
      clientId,
      replyTo: null,
      readBy: [],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically add to UI
    dispatch(addOptimisticMessage({ conversationId, message: optimisticMsg }));

    const pending: PendingMessage = { clientId, conversationId, content, type, createdAt: optimisticMsg.createdAt };

    // Check online status
    if (!navigator.onLine) {
      await savePendingMessage(pending);
      return rejectWithValue({ offline: true, clientId });
    }

    try {
      await api.post(`/conversations/${conversationId}/messages`, { content, type, clientId, replyTo });
      return { clientId };
    } catch (err: any) {
      // Save for later if request fails
      await savePendingMessage(pending);
      return rejectWithValue({ error: err.response?.data?.message, clientId });
    }
  }
);

// Flush offline queue when back online
export const flushOfflineQueue = createAsyncThunk(
  'messages/flushQueue',
  async (_, { dispatch, getState }) => {
    const pending = await getPendingMessages();
    const results: string[] = [];

    for (const msg of pending) {
      try {
        await api.post(`/conversations/${msg.conversationId}/messages`, {
          content: msg.content,
          type: msg.type,
          clientId: msg.clientId,
        });
        await removePendingMessage(msg.clientId);
        results.push(msg.clientId);
      } catch {
        // Keep in queue for retry
      }
    }
    return results;
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    addOptimisticMessage(state, action: PayloadAction<{ conversationId: string; message: Message }>) {
      const { conversationId, message } = action.payload;
      if (!state.byConversation[conversationId]) state.byConversation[conversationId] = [];
      state.byConversation[conversationId].push(message);
    },
    addIncomingMessage(state, action: PayloadAction<Message>) {
      const { conversationId, clientId, _id } = action.payload;
      if (!state.byConversation[conversationId]) state.byConversation[conversationId] = [];

      // Replace optimistic if clientId matches
      const idx = clientId
        ? state.byConversation[conversationId].findIndex((m) => m.clientId === clientId || m._id === clientId)
        : -1;

      if (idx >= 0) {
        state.byConversation[conversationId][idx] = action.payload;
      } else {
        // Avoid duplicates
        const exists = state.byConversation[conversationId].some((m) => m._id === _id);
        if (!exists) state.byConversation[conversationId].push(action.payload);
      }
    },
    updateMessageStatus(state, action: PayloadAction<{ clientId: string; messageId: string; status: Message['status']; conversationId: string }>) {
      const { clientId, messageId, status, conversationId } = action.payload;
      const msgs = state.byConversation[conversationId];
      if (!msgs) return;
      const msg = msgs.find((m) => m.clientId === clientId || m._id === clientId);
      if (msg) {
        msg.status = status;
        if (messageId && msg._id === clientId) msg._id = messageId;
      }
    },
    deleteMessageLocally(state, action: PayloadAction<{ conversationId: string; messageId: string }>) {
      const { conversationId, messageId } = action.payload;
      const msgs = state.byConversation[conversationId];
      if (msgs) {
        const msg = msgs.find((m) => m._id === messageId);
        if (msg) { msg.isDeleted = true; msg.content = 'This message was deleted'; }
      }
    },
    clearConversationMessages(state, action: PayloadAction<string>) {
      delete state.byConversation[action.payload];
      delete state.cursors[action.payload];
      delete state.hasMore[action.payload];
    },
    removePendingFromState(state, action: PayloadAction<string>) {
      state.pendingMessages = state.pendingMessages.filter((m) => m.clientId !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        const convId = action.meta.arg.conversationId;
        state.isLoading[convId] = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, pagination } = action.payload as { conversationId: string; pagination: any; messages?: Message[]; data?: { messages?: Message[] } };
        const payloadMessages = (action.payload as any).messages ?? (action.payload as any).data?.messages ?? [];
        state.isLoading[conversationId] = false;
        const existing = state.byConversation[conversationId] || [];
        // Prepend older messages (infinite scroll up)
        const existingIds = new Set(existing.map((m: Message) => m._id));
        const newMsgs = payloadMessages.filter((m: Message) => !existingIds.has(m._id));
        state.byConversation[conversationId] = [...newMsgs, ...existing];
        state.hasMore[conversationId] = pagination?.hasMore ?? false;
        state.cursors[conversationId] = pagination?.nextCursor;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const convId = action.meta.arg.conversationId;
        state.isLoading[convId] = false;
      })
      .addCase(flushOfflineQueue.fulfilled, (state, action) => {
        // Mark flushed messages as sent in state
        const flushedIds = action.payload;
        for (const convId in state.byConversation) {
          state.byConversation[convId] = state.byConversation[convId].map((m) =>
            flushedIds.includes(m.clientId || '') ? { ...m, status: 'sent' } : m
          );
        }
      });
  },
});

export const {
  addOptimisticMessage,
  addIncomingMessage,
  updateMessageStatus,
  deleteMessageLocally,
  clearConversationMessages,
  removePendingFromState,
} = messagesSlice.actions;

export default messagesSlice.reducer;
