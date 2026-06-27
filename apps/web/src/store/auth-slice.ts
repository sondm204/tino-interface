import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/src/types/domain";

type AuthState = {
  user: User | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  user: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.hydrated = true;
    },
    setCurrentUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.hydrated = true;
    },
    clearCurrentUser(state) {
      state.user = null;
      state.hydrated = true;
    },
  },
});

export const { clearCurrentUser, hydrateAuth, setCurrentUser } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
