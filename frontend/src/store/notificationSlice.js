import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { miscApi } from '../api/endpoints';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  return miscApi.notifications();
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.notifications || [];
        state.unreadCount = action.payload.unreadCount || 0;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default notificationSlice.reducer;
