<script setup lang="ts">
import { computed } from "vue";

import { useElevatorStore } from "@/stores/elevator";
import type { ElevatorVm } from "@/types/api";

const store = useElevatorStore();
const floors = computed(() => store.state?.config.floors ?? 0);
const floorList = computed(() =>
  Array.from({ length: floors.value }, (_, i) => floors.value - 1 - i),
);
const elevators = computed(() => store.state?.elevators ?? []);

const callUp = (floor: number) => {
  void store.call(floor, "up");
};
const callDown = (floor: number) => {
  void store.call(floor, "down");
};
const selectFloor = (elevatorId: number, floor: number) => {
  void store.select(elevatorId, floor);
};

const elevatorStyle = (e: ElevatorVm) => {
  const fh = 48;
  const y = (floors.value - 1 - e.currentFloor) * fh;
  return { transform: `translateY(${y}px)` };
};

const floorsStyle = computed(
  () => ({ "--floors": String(floors.value) }) as Record<string, string>,
);

const showError = computed({
  get: () => !!store.error,
  set: (v: boolean) => {
    if (!v) store.error = null;
  },
});
</script>

<template>
  <VContainer class="py-6">
    <VRow no-gutters>
      <VCol cols="2">
        <div class="d-flex flex-column">
          <div
            v-for="f in floorList"
            :key="f"
            class="d-flex align-center mb-2"
            style="height: 40px"
          >
            <div class="text-subtitle-2 text-right pr-2" style="width: 24px">
              {{ f }}
            </div>

            <div class="d-flex ga-2">
              <VBtn
                size="x-small"
                variant="outlined"
                :disabled="f === floors - 1"
                @click="callUp(f)"
              >
                ▲
              </VBtn>

              <VBtn
                size="x-small"
                variant="outlined"
                :disabled="f === 0"
                @click="callDown(f)"
              >
                ▼
              </VBtn>
            </div>
          </div>
        </div>
      </VCol>

      <VCol cols="10">
        <div class="shafts-grid">
          <div v-for="e in elevators" :key="e.id" class="shaft">
            <div class="levels" :style="floorsStyle">
              <div
                v-for="f in floorList"
                :key="`l-${e.id}-${f}`"
                class="level"
              ></div>
              <div class="car" :class="e.door" :style="elevatorStyle(e)">
                <div class="id">#{{ e.id }}</div>
                <div class="dir">{{ e.direction.toUpperCase() }}</div>
              </div>
            </div>

            <div class="text-caption mt-2">
              targets: {{ e.targets.join(", ") || "—" }}
            </div>

            <div class="d-flex flex-wrap ga-1 mt-1">
              <VBtn
                v-for="f in floorList.slice().reverse()"
                :key="`btn-${e.id}-${f}`"
                size="x-small"
                variant="tonal"
                @click="selectFloor(e.id, f)"
              >
                {{ f }}
              </VBtn>
            </div>
          </div>
        </div>
      </VCol>
    </VRow>

    <VSnackbar v-model="showError" color="error" timeout="2000">
      {{ store.error }}
    </VSnackbar>
  </VContainer>
</template>

<style scoped>
.shaft {
  width: 220px;
}

.shafts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  align-items: start;
}

.levels {
  position: relative;
  height: calc(48px * var(--floors, 16));
  border: 1px solid #dadada;
  background: #fafafa;
  border-radius: 8px;
  overflow: hidden;
}

.level {
  height: 48px;
  border-bottom: 1px dashed #eee;
}

.car {
  position: absolute;
  top: 0;
  left: 12px;
  width: calc(100% - 24px);
  height: 44px;
  margin-top: 2px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  transition: transform 0.18s linear;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.car.open {
  background: #e8f5e9;
  border-color: #a5d6a7;
}
.car.closing {
  background: #fff8e1;
  border-color: #ffe082;
}
.car.opening {
  background: #f3e5f5;
  border-color: #ce93d8;
}

.id {
  font-weight: 700;
}
.dir {
  font-size: 11px;
  letter-spacing: 0.08em;
  opacity: 0.7;
}
</style>
