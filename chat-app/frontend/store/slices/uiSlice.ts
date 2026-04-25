import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isOnline: boolean;
  typingUsers: Record<string, { userId: string; username: string }[]>;
  onlineUsers: string[];
  sidebarOpen: boolean;
}

const initialState: UIState = {
  isOnline: true,
  typingUsers: {},
  onlineUsers: [],
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setOnlineStatus(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
    },
    addOnlineUser(state, action: PayloadAction<string>) {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    removeOnlineUser(state, action: PayloadAction<string>) {
      state.onlineUsers = state.onlineUsers.filter((id) => id !== action.payload);
    },
    setTyping(state, action: PayloadAction<{ conversationId: string; userId: string; username: string; isTyping: boolean }>) {
      const { conversationId, userId, username, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) state.typingUsers[conversationId] = [];

      if (isTyping) {
        const exists = state.typingUsers[conversationId].some((u) => u.userId === userId);
        if (!exists) state.typingUsers[conversationId].push({ userId, username });
      } else {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter((u) => u.userId !== userId);
      }
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { setOnlineStatus, addOnlineUser, removeOnlineUser, setTyping, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
