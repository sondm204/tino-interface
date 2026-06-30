import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/store/auth-slice";
import { tinoApiSlice } from "@/store/tino-api-slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [tinoApiSlice.reducerPath]: tinoApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tinoApiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
