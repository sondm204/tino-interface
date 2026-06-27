import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/src/store/auth-slice";
import { tinoApiSlice } from "@/src/store/tino-api-slice";

export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [tinoApiSlice.reducerPath]: tinoApiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(tinoApiSlice.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
