import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import { Conversation, ConversationState, Message } from '../../types';

const initialState: ConversationState = {
  list: [],
  active: null,
  isLoading: false,
};

export const fetchConversations = createAsyncThunk(
  'conversations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/conversations');
      return data.data.conversations;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

export const getOrCreateDirect = createAsyncThunk(
  'conversations/getOrCreateDirect',
  async (targetUserId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/conversations/direct/${targetUserId}`);
      return data.data.conversation;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

export const createGroup = createAsyncThunk(
  'conversations/createGroup',
  async (payload: { name: string; participantIds: string[] }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/conversations/group', payload);
      return data.data.conversation;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setActive(state, action: PayloadAction<string | null>) {
      state.active = action.payload;
    },
    updateLastMessage(state, action: PayloadAction<{ conversationId: string; message: Message }>) {
      const { conversationId, message } = action.payload;
      const conv = state.list.find((c) => c._id === conversationId);
      if (conv) {
        conv.lastMessage = message;
        conv.lastMessageAt = message.createdAt;
        // Move to top
        state.list = [conv, ...state.list.filter((c) => c._id !== conversationId)];
      }
    },
    incrementUnread(state, action: PayloadAction<{ conversationId: string; userId: string }>) {
      const conv = state.list.find((c) => c._id === action.payload.conversationId);
      if (conv && action.payload.conversationId !== state.active) {
        const current = conv.unreadCount[action.payload.userId] || 0;
        conv.unreadCount[action.payload.userId] = current + 1;
      }
    },
    clearUnread(state, action: PayloadAction<{ conversationId: string; userId: string }>) {
      const conv = state.list.find((c) => c._id === action.payload.conversationId);
      if (conv) conv.unreadCount[action.payload.userId] = 0;
    },
    updateParticipantStatus(state, action: PayloadAction<{ userId: string; status: string }>) {
      for (const conv of state.list) {
        const participant = conv.participants.find((p) => p._id === action.payload.userId);
        if (participant) participant.status = action.payload.status as any;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => { state.isLoading = true; })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchConversations.rejected, (state) => { state.isLoading = false; })
      .addCase(getOrCreateDirect.fulfilled, (state, action) => {
        const exists = state.list.some((c) => c._id === action.payload._id);
        if (!exists) state.list.unshift(action.payload);
        state.active = action.payload._id;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.active = action.payload._id;
      });
  },
});

export const { setActive, updateLastMessage, incrementUnread, clearUnread, updateParticipantStatus } =
  conversationsSlice.actions;

export default conversationsSlice.reducer;
