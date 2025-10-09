import { defineStore } from "pinia";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { ref, computed } from "vue";

import type { SystemStateVm, OkVm, ElevatorVm } from "@/types/api";

type Fetcher = <T>(path: string, init?: RequestInit) => Promise<T>;

const toMessage = (e: unknown): string =>
  e instanceof Error
    ? e.message
    : typeof e === "string"
      ? e
      : JSON.stringify(e);

function createFetcher(baseUrl: string): Fetcher {
  return async <T>(path: string, init?: RequestInit) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data: unknown = await res.json();
    return data as T;
  };
}

export const useElevatorStore = defineStore("elevator", () => {
  const apiUrl: string =
    (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3000";

  const fetcher = createFetcher(apiUrl);
  const state = ref<SystemStateVm | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const wsConnected = ref(false);

  const socket = ref<Socket | null>(null);
  let pollTimer: number | undefined;

  const floors = computed(() => state.value?.config.floors ?? 0);
  const elevators = computed<ElevatorVm[]>(() => state.value?.elevators ?? []);
  const connected = computed(() => wsConnected.value);

  const initState = async (): Promise<void> => {
    state.value = await fetcher<SystemStateVm>("/elevator/state");
  };

  const startPolling = (): void => {
    stopPolling();
    pollTimer = window.setInterval(
      async () => {
        try {
          const s = await fetcher<SystemStateVm>("/elevator/state");
          state.value = s;
        } catch {
          // ignorujemy krótkie przerwy
        }
      },
      Math.max(200, state.value?.config.tickMs ?? 300),
    );
  };

  const stopPolling = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };

  const connectWs = (): void => {
    const wsUrl = `${apiUrl}/ws`;
    socket.value = io(wsUrl, {
      transports: ["websocket", "polling"],
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      timeout: 5000,
    });

    socket.value.on("connect", () => {
      console.info("[WS] connected", wsUrl);
      wsConnected.value = true;
      stopPolling();
    });
    socket.value.on("disconnect", (reason) => {
      console.warn("[WS] disconnected:", reason);
      wsConnected.value = false;
      startPolling();
    });
    socket.value.on("connect_error", (err) => {
      console.error("[WS] connect_error:", err?.message ?? err);
    });
    socket.value.on("state", (s: SystemStateVm) => {
      state.value = s;
    });
  };

  const handle = async <T>(fn: () => Promise<T>): Promise<T> => {
    loading.value = true;
    error.value = null;
    try {
      return await fn();
    } catch (e: unknown) {
      error.value = toMessage(e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  // actions
  const reset = async (
    partial?: Partial<SystemStateVm["config"]>,
  ): Promise<void> => {
    await handle(async () => {
      const body =
        partial && Object.keys(partial).length > 0
          ? partial
          : (state.value?.config ?? {});

      await fetcher<OkVm>("/elevator/reset", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await initState();
    });
  };

  const call = async (
    floor: number,
    direction: "up" | "down",
  ): Promise<void> => {
    await handle(async () => {
      await fetcher<OkVm>("/elevator/call", {
        method: "POST",
        body: JSON.stringify({ floor, direction }),
      });
    });
  };

  const select = async (elevatorId: number, floor: number): Promise<void> => {
    await handle(async () => {
      await fetcher<OkVm>("/elevator/select", {
        method: "POST",
        body: JSON.stringify({ elevatorId, floor }),
      });
    });
  };

  const pause = async (): Promise<void> => {
    await fetcher<OkVm>("/elevator/pause", { method: "POST" });
  };
  const resume = async (): Promise<void> => {
    await fetcher<OkVm>("/elevator/resume", { method: "POST" });
  };
  const step = async (n = 1): Promise<void> => {
    await fetcher<OkVm>(`/elevator/step?n=${n}`, { method: "POST" });
  };

  const boot = async (): Promise<void> => {
    await initState();
    connectWs();
    setTimeout(() => {
      if (!wsConnected.value) startPolling();
    }, 1000);
  };

  return {
    state,
    floors,
    elevators,
    loading,
    error,
    connected,
    boot,
    reset,
    call,
    select,
    pause,
    resume,
    step,
  };
});
