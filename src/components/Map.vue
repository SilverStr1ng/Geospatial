<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as Cesium from 'cesium';
import {
  NButton,
  NButtonGroup,
  NCard,
  NDivider,
  NIcon,
  NTooltip,
  useMessage
} from 'naive-ui';
import {
  Settings,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Map as MapIcon,
  Stack,
  Camera,
  Ruler,
  Download,
  Upload,
  Home,
  Compass,
} from '@vicons/tabler';

import {
  CloudRound
} from '@vicons/material';

import Cloud from '@/postrender/Cloud/Cloud.js'

let viewer: Cesium.Viewer;
const message = useMessage();

// 菜单可见性控制
const menuVisible = ref(true);

// 功能状态
const terrainVisible = ref(true);
const atmosphereVisible = ref(true);
const lightingEnabled = ref(true);

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ACCESS_TOKEN;

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
})

// 菜单功能函数
const toggleMenu = () => {
  menuVisible.value = !menuVisible.value;
}

const goHome = () => {
  viewer?.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.4074, 39.9042, 15000000),
  });
  message.info('已回到地球视图');
}

const toggleTerrain = () => {
  if (viewer) {
    terrainVisible.value = !terrainVisible.value;
    viewer.scene.globe.show = terrainVisible.value;
    message.info(terrainVisible.value ? '地形已显示' : '地形已隐藏');
  }
}

const toggleAtmosphere = () => {
  if (viewer) {
    atmosphereVisible.value = !atmosphereVisible.value;
    viewer.scene.skyAtmosphere.show = atmosphereVisible.value;
    viewer.scene.fog.enabled = atmosphereVisible.value;
    message.info(atmosphereVisible.value ? '大气已显示' : '大气已隐藏');
  }
}

const toggleLighting = () => {
  if (viewer) {
    lightingEnabled.value = !lightingEnabled.value;
    viewer.scene.globe.enableLighting = lightingEnabled.value;
    message.info(lightingEnabled.value ? '光照已启用' : '光照已禁用');
  }
}

// 显示云层
const showCloudLayer = () => {
  const cloud = new Cloud({
    viewer: viewer
  });

  cloud._createPrimitive();
}

const switchTo3D = () => {
  viewer?.scene.morphTo3D(1.0);
  message.info('切换到3D视图');
}

const switchTo2D = () => {
  viewer?.scene.morphTo2D(1.0);
  message.info('切换到2D视图');
}

const switchToColumbus = () => {
  viewer?.scene.morphToColumbusView(1.0);
  message.info('切换到哥伦布视图');
}

const measureDistance = () => {
  message.info('距离测量功能待实现');
}

const measureArea = () => {
  message.info('面积测量功能待实现');
}

const importData = () => {
  message.info('数据导入功能待实现');
}

const exportData = () => {
  message.info('数据导出功能待实现');
}

const openSettings = () => {
  message.info('设置面板功能待实现');
}
</script>

<template>
  <div id="container">
    <div class="menu-toggle">
      <n-tooltip placement="right" trigger="hover">
        <template #trigger>
          <n-button circle type="primary" @click="toggleMenu"
            :style="{ backgroundColor: '#1890ff', borderColor: '#1890ff' }">
            <template #icon>
              <n-icon>
                <Settings />
              </n-icon>
            </template>
          </n-button>
        </template>
        {{ menuVisible ? '隐藏菜单' : '显示菜单' }}
      </n-tooltip>
    </div>

    <!-- 悬浮菜单面板 -->
    <transition name="slide-fade">
      <div v-if="menuVisible" class="floating-menu">
        <n-card title="功能菜单" size="small" :style="{
          width: '280px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }">
          <!-- 视图控制组 -->
          <div class="menu-group">
            <h4 class="group-title">
              <n-icon>
                <MapIcon />
              </n-icon>
              视图控制
            </h4>
            <n-button-group>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="goHome" size="small">
                    <template #icon><n-icon>
                        <Home />
                      </n-icon></template>
                  </n-button>
                </template>
                回到地球视图
              </n-tooltip>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="switchTo3D" size="small">3D</n-button>
                </template>
                三维视图
              </n-tooltip>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="switchTo2D" size="small">2D</n-button>
                </template>
                二维视图
              </n-tooltip>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="switchToColumbus" size="small">CB</n-button>
                </template>
                哥伦布视图
              </n-tooltip>
            </n-button-group>
          </div>

          <n-divider />

          <!-- 显示控制组 -->
          <div class="menu-group">
            <h4 class="group-title">
              <n-icon>
                <Stack />
              </n-icon>
              显示控制
            </h4>
            <div class="button-row">
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="toggleTerrain" size="small" :type="terrainVisible ? 'primary' : 'default'">
                    <template #icon>
                      <n-icon>
                        <Eye v-if="terrainVisible" />
                        <EyeOff v-else />
                      </n-icon>
                    </template>
                    地形
                  </n-button>
                </template>
                {{ terrainVisible ? '隐藏地形' : '显示地形' }}
              </n-tooltip>
            </div>
            <div class="button-row">
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="toggleAtmosphere" size="small" :type="atmosphereVisible ? 'primary' : 'default'">
                    <template #icon>
                      <n-icon>
                        <Eye v-if="atmosphereVisible" />
                        <EyeOff v-else />
                      </n-icon>
                    </template>
                    大气
                  </n-button>
                </template>
                {{ atmosphereVisible ? '隐藏大气' : '显示大气' }}
              </n-tooltip>
            </div>
            <div class="button-row">
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="toggleLighting" size="small" :type="lightingEnabled ? 'primary' : 'default'">
                    <template #icon>
                      <n-icon>
                        <Sun v-if="lightingEnabled" />
                        <Moon v-else />
                      </n-icon>
                    </template>
                    光照
                  </n-button>
                </template>
                {{ lightingEnabled ? '禁用光照' : '启用光照' }}
              </n-tooltip>
            </div>
            <div class="button-row">
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="showCloudLayer" size="small" type='primary'>
                    <template #icon>
                      <n-icon>
                        <CloudRound />
                      </n-icon>
                    </template>
                    云层
                  </n-button>
                </template>
                显示云层
              </n-tooltip>
            </div>
          </div>

          <n-divider />

          <!-- 测量工具组 -->
          <div class="menu-group">
            <h4 class="group-title">
              <n-icon>
                <Ruler />
              </n-icon>
              测量工具
            </h4>
            <n-button-group>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="measureDistance" size="small">
                    距离
                  </n-button>
                </template>
                测量距离
              </n-tooltip>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="measureArea" size="small">
                    面积
                  </n-button>
                </template>
                测量面积
              </n-tooltip>
            </n-button-group>
          </div>

          <n-divider />

          <!-- 数据操作组 -->
          <div class="menu-group">
            <h4 class="group-title">
              <n-icon>
                <Camera />
              </n-icon>
              数据操作
            </h4>
            <n-button-group>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="importData" size="small">
                    <template #icon><n-icon>
                        <Upload />
                      </n-icon></template>
                    导入
                  </n-button>
                </template>
                导入数据
              </n-tooltip>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button @click="exportData" size="small">
                    <template #icon><n-icon>
                        <Download />
                      </n-icon></template>
                    导出
                  </n-button>
                </template>
                导出数据
              </n-tooltip>
            </n-button-group>
          </div>

          <n-divider />

          <!-- 设置组 -->
          <div class="menu-group">
            <n-button @click="openSettings" size="small" block>
              <template #icon><n-icon>
                  <Settings />
                </n-icon></template>
              高级设置
            </n-button>
          </div>
        </n-card>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="less">
#container {
  width: 100%;
  height: 100vh;
  position: relative;
}

/* 菜单切换按钮 */
.menu-toggle {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
}

/* 悬浮菜单面板 */
.floating-menu {
  position: absolute;
  top: 70px;
  left: 20px;
  z-index: 999;
  max-height: calc(100vh - 100px);
  overflow-y: auto;

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.5);
    }
  }
}

/* 菜单组样式 */
.menu-group {
  margin-bottom: 12px;

  .group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .button-row {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .floating-menu {
    left: 10px;
    top: 60px;

    .n-card {
      width: 260px !important;
    }
  }

  .menu-toggle {
    top: 10px;
    left: 10px;
  }
}

/* Naive UI 组件自定义样式 */
:deep(.n-button-group) {
  display: flex;
  gap: 4px;

  .n-button {
    flex: 1;
  }
}

:deep(.n-card-header) {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

:deep(.n-card__content) {
  padding: 16px;
}

:deep(.n-divider) {
  margin: 12px 0;
}
</style>