<script setup lang="ts">
import Map from './components/Map.vue';
import { darkTheme, NConfigProvider, NMessageProvider } from 'naive-ui'

</script>

<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <div>
        <Map />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style lang="less" scoped></style>