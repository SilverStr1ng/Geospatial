<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as Cesium from 'cesium'

import GlobalVolumetricClouds from '@/postrender/Cloud/Cloud.ts'

let viewer: Cesium.Viewer

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ACCESS_TOKEN

onMounted(async () => {
  viewer = new Cesium.Viewer('container', {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    homeButton: false,
    geocoder: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    shouldAnimate: true,
    infoBox: false,
  })

  // 在线地形
  viewer.terrainProvider = await Cesium.createWorldTerrainAsync({
    requestWaterMask: false,
    requestVertexNormals: true,
  })

  // 配置
  viewer.shadows = true
  viewer.resolutionScale = 1.0
  viewer.scene.msaaSamples = 4
  viewer.scene.globe.depthTestAgainstTerrain = true  // 深度测试
  viewer.scene.logarithmicDepthBuffer = true  // log深度
  viewer.scene.highDynamicRange = true
  viewer.scene.debugShowFramesPerSecond = true

  // 创建大气
  viewer.scene.fog.enabled = true
  viewer.scene.globe.enableLighting = true;

  window.__viewer = viewer
  

  setTimeout(() => {
    const clouds = new GlobalVolumetricClouds(window.__viewer, {
      cloudCover: 0.8,
      windSpeedRatio: 0.0005
    })

    clouds.init()
  }, 5000);
})
</script>

<template>
  <div id="container">

  </div>
</template>

<style scoped lang="less">
#container {
  width: 100%;
  height: 100vh;
}
</style>