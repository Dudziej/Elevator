<script setup lang="ts">
import { useElevatorStore } from "@/stores/elevator";
const store = useElevatorStore();
</script>

<template>
  <VAppBar density="comfortable" flat>
    <VAppBarTitle>Elevator Simulation</VAppBarTitle>

    <VSpacer />

    <VChip v-if="store.connected" variant="flat" color="success" size="small">
      WS
    </VChip>

    <VChip v-else variant="flat" color="warning" size="small"> Polling </VChip>

    <VDivider vertical class="mx-3" />

    <VBtn size="small" @click="store.reset()"> Reset </VBtn>

    <VBtn size="small" @click="store.pause()"> Pause </VBtn>

    <VBtn size="small" @click="store.resume()"> Resume </VBtn>

    <VBtn size="small" @click="store.step(10)"> Step x10 </VBtn>
  </VAppBar>
</template>
