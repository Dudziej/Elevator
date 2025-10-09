<script setup lang="ts">
import { onMounted } from "vue";

import AppToolbar from "@/components/AppToolbar.vue";
import BuildingView from "@/components/BuildingView.vue";
import { useElevatorStore } from "@/stores/elevator";

const store = useElevatorStore();
onMounted(() => {
  void store.boot();
});
</script>

<template>
  <VApp>
    <AppToolbar />
    <VMain>
      <BuildingView />
    </VMain>
  </VApp>
</template>
