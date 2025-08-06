<script setup lang="ts">
import { onMounted, ref, computed, h } from 'vue';
import * as Cesium from 'cesium';
import {
  NButton,
  NButtonGroup,
  NCard,
  NDivider,
  NIcon,
  NTooltip,
  NScrollbar,
  NDropdown,
  NSpace,
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
  Star,
  ChevronLeft,
  ChevronRight,
  Menu2
} from '@vicons/tabler';

import {
  CloudRound
} from '@vicons/material';

import Cloud from '@/postrender/Cloud/Cloud.js'

let viewer: Cesium.Viewer;
const message = useMessage();

// 菜单可见性控制
const menuVisible = ref(true);
const menuCollapsed = ref(true); // 默认折叠状态
const activeMenuGroup = ref('display'); // 当前激活的菜单组，默认显示控制

// 功能状态
const terrainVisible = ref(true);
const atmosphereVisible = ref(true);
const lightingEnabled = ref(true);
const cloudVisible = ref(false);

// 菜单配置 - 支持扩展到更多分类
const menuGroups = ref([
  {
    id: 'display',
    name: '显示',
    icon: 'Stack',
    color: '#1890ff',
    items: [
      { id: 'terrain', name: '地形', icon: 'Eye', action: 'toggleTerrain' },
      { id: 'atmosphere', name: '大气', icon: 'Eye', action: 'toggleAtmosphere' },
      { id: 'lighting', name: '光照', icon: 'Sun', action: 'toggleLighting' },
      { id: 'cloud', name: '云层', icon: 'CloudRound', action: 'showCloudLayer' }
    ]
  },
  {
    id: 'measure',
    name: '测量',
    icon: 'Ruler',
    color: '#52c41a',
    items: [
      { id: 'distance', name: '距离', icon: 'Ruler', action: 'measureDistance' },
      { id: 'area', name: '面积', icon: 'Stack', action: 'measureArea' }
    ]
  },
  {
    id: 'data',
    name: '数据',
    icon: 'Camera',
    color: '#fa8c16',
    items: [
      { id: 'import', name: '导入', icon: 'Upload', action: 'importData' },
      { id: 'export', name: '导出', icon: 'Download', action: 'exportData' },
      { id: 'settings', name: '设置', icon: 'Settings', action: 'openSettings' }
    ]
  },
  {
    id: 'analysis',
    name: '分析',
    icon: 'Compass',
    color: '#722ed1',
    items: [
      { id: 'profile', name: '剖面', icon: 'Ruler', action: 'createProfile' },
      { id: 'viewshed', name: '视域', icon: 'Eye', action: 'createViewshed' }
    ]
  },
  {
    id: 'layers',
    name: '图层',
    icon: 'Stack',
    color: '#eb2f96',
    items: [
      { id: 'imagery', name: '影像', icon: 'MapIcon', action: 'toggleImagery' },
      { id: 'vector', name: '矢量', icon: 'Stack', action: 'toggleVector' }
    ]
  },
  {
    id: 'navigation',
    name: '导航',
    icon: 'Compass',
    color: '#13c2c2',
    items: [
      { id: 'home', name: '首页', icon: 'Home', action: 'goHome' },
      { id: 'bookmark', name: '书签', icon: 'Star', action: 'manageBookmarks' }
    ]
  },
  {
    id: 'tools',
    name: '工具',
    icon: 'Settings',
    color: '#f5222d',
    items: [
      { id: 'screenshot', name: '截图', icon: 'Camera', action: 'takeScreenshot' },
      { id: 'record', name: '录制', icon: 'Download', action: 'recordVideo' }
    ]
  },
  {
    id: 'simulation',
    name: '仿真',
    icon: 'Sun',
    color: '#faad14',
    items: [
      { id: 'time', name: '时间', icon: 'Sun', action: 'timeControl' },
      { id: 'weather', name: '天气', icon: 'CloudRound', action: 'weatherControl' }
    ]
  }
]);

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

const toggleMenuCollapse = () => {
  menuCollapsed.value = !menuCollapsed.value;
}

const setActiveMenuGroup = (group: string) => {
  activeMenuGroup.value = group;
  // 点击图标时自动展开菜单显示详细功能
  if (menuCollapsed.value) {
    menuCollapsed.value = false;
  }
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
  if (cloudVisible.value) {
    // 隐藏云层的逻辑（待实现）
    cloudVisible.value = false;
    message.info('云层已隐藏');
    return;
  }

  const cloud = new Cloud({
    viewer: viewer
  });

  cloud._createPrimitive();
  cloudVisible.value = true;
  message.info('云层已显示');
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

// 新增的功能函数
const createProfile = () => {
  message.info('剖面分析功能待实现');
}

const createViewshed = () => {
  message.info('视域分析功能待实现');
}

const toggleImagery = () => {
  message.info('影像图层切换功能待实现');
}

const toggleVector = () => {
  message.info('矢量图层切换功能待实现');
}

const manageBookmarks = () => {
  message.info('书签管理功能待实现');
}

const takeScreenshot = () => {
  message.info('截图功能待实现');
}

const recordVideo = () => {
  message.info('录制功能待实现');
}

const timeControl = () => {
  message.info('时间控制功能待实现');
}

const weatherControl = () => {
  message.info('天气控制功能待实现');
}

// 执行菜单项动作
const executeAction = (actionName: string) => {
  const actions: { [key: string]: () => void } = {
    toggleTerrain,
    toggleAtmosphere,
    toggleLighting,
    showCloudLayer,
    measureDistance,
    measureArea,
    importData,
    exportData,
    openSettings,
    createProfile,
    createViewshed,
    toggleImagery,
    toggleVector,
    goHome,
    manageBookmarks,
    takeScreenshot,
    recordVideo,
    timeControl,
    weatherControl
  };
  
  if (actions[actionName]) {
    actions[actionName]();
  }
}

// 图标组件映射
const iconComponents = {
  Settings,
  Eye,
  EyeOff,
  Sun,
  Moon,
  MapIcon,
  Stack,
  Camera,
  Ruler,
  Download,
  Upload,
  Home,
  Compass,
  Star,
  ChevronLeft,
  ChevronRight,
  Menu2,
  CloudRound
};

// 获取图标组件
const getIconComponent = (iconName: string) => {
  return iconComponents[iconName as keyof typeof iconComponents] || Settings;
}

// 当前活动的菜单组
const currentGroup = computed(() => {
  return menuGroups.value.find(group => group.id === activeMenuGroup.value);
});

// 更多菜单选项 - 显示所有分类
const moreMenuOptions = computed(() => {
  return menuGroups.value.map(group => ({
    label: group.name,
    key: group.id,
    icon: () => h(NIcon, { size: 16 }, { default: () => h(getIconComponent(group.icon)) })
  }));
});

// 处理更多菜单选择
const handleMoreMenuSelect = (key: string) => {
  setActiveMenuGroup(key);
}

// 获取提示文本
const getTooltipText = (item: any) => {
  const tooltipMap: { [key: string]: string } = {
    terrain: terrainVisible.value ? '隐藏地形' : '显示地形',
    atmosphere: atmosphereVisible.value ? '隐藏大气' : '显示大气',
    lighting: lightingEnabled.value ? '禁用光照' : '启用光照',
    cloud: cloudVisible.value ? '隐藏云层' : '显示云层',
    distance: '测量距离',
    area: '测量面积',
    import: '导入数据',
    export: '导出数据',
    settings: '高级设置',
    profile: '剖面分析',
    viewshed: '视域分析',
    imagery: '影像图层',
    vector: '矢量图层',
    home: '回到首页',
    bookmark: '书签管理',
    screenshot: '截图',
    record: '录制',
    time: '时间控制',
    weather: '天气控制'
  };
  
  return tooltipMap[item.id] || item.name;
}

// 获取按钮显示文本（缩短长文本）
const getButtonText = (item: any) => {
  const shortTextMap: { [key: string]: string } = {
    profile: '剖面',
    viewshed: '视域',
    screenshot: '截图',
    bookmark: '书签',
    settings: '设置'
  };
  
  return shortTextMap[item.id] || item.name;
}
</script>

<template>
  <div id="container">
    <!-- 菜单切换按钮 -->
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

    <!-- 优化的悬浮菜单面板 - 支持多分类扩展 -->
    <transition name="slide-fade">
      <div v-if="menuVisible" class="floating-menu" :class="{ 'collapsed': menuCollapsed }">
        <n-card :title="menuCollapsed ? '' : '功能菜单'" size="small" :style="{
          width: menuCollapsed ? '60px' : '380px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease'
        }">
          <!-- 菜单头部控制 -->
          <template #header-extra v-if="!menuCollapsed">
            <n-space>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button size="tiny" quaternary @click="toggleMenuCollapse">
                    <template #icon>
                      <n-icon>
                        <Menu2 />
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                折叠菜单
              </n-tooltip>
            </n-space>
          </template>

          <!-- 折叠状态的垂直图标导航 - 显示所有分类 -->
          <div v-if="menuCollapsed" class="collapsed-nav">
            <n-tooltip placement="right" trigger="hover">
              <template #trigger>
                <n-button size="small" quaternary @click="toggleMenuCollapse" class="nav-item expand-btn">
                  <template #icon>
                    <n-icon size="20">
                      <Menu2 />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              展开菜单
            </n-tooltip>

            <!-- 分隔线 -->
            <div class="nav-divider"></div>

            <!-- 动态生成所有菜单分类图标 -->
            <div v-for="group in menuGroups" :key="group.id" class="nav-group">
              <n-tooltip placement="right" trigger="hover">
                <template #trigger>
                  <n-button 
                    size="small" 
                    quaternary 
                    @click="setActiveMenuGroup(group.id)"
                    :type="activeMenuGroup === group.id ? 'primary' : 'default'" 
                    class="nav-item"
                    :style="{ 
                      '--group-color': group.color,
                      backgroundColor: activeMenuGroup === group.id ? group.color + '20' : 'transparent',
                      borderColor: activeMenuGroup === group.id ? group.color : 'transparent'
                    }">
                    <template #icon>
                      <n-icon size="18" :style="{ color: activeMenuGroup === group.id ? group.color : '#666' }">
                        <component :is="getIconComponent(group.icon)" />
                      </n-icon>
                    </template>
                  </n-button>
                </template>
                <div class="tooltip-content">
                  <div class="tooltip-title">{{ group.name }}</div>
                  <div class="tooltip-desc">{{ group.items.length }}个功能</div>
                </div>
              </n-tooltip>
            </div>

            <!-- 分隔线 -->
            <div class="nav-divider"></div>

            <!-- 快捷菜单下拉 -->
            <n-dropdown 
              :options="moreMenuOptions" 
              placement="right-start"
              @select="handleMoreMenuSelect"
              :show-arrow="true">
              <n-button size="small" quaternary class="nav-item quick-menu-btn">
                <template #icon>
                  <n-icon size="18">
                    <Settings />
                  </n-icon>
                </template>
              </n-button>
            </n-dropdown>
          </div>

          <!-- 展开状态的优化菜单 -->
          <div v-else class="expanded-menu">
            <!-- 快速分类切换按钮组 -->
            <div class="quick-nav">
              <div class="quick-nav-header">
                <span class="quick-nav-title">功能分类</span>
                <n-button size="tiny" quaternary @click="toggleMenuCollapse" class="collapse-btn">
                  <template #icon>
                    <n-icon size="16">
                      <ChevronLeft />
                    </n-icon>
                  </template>
                  收起
                </n-button>
              </div>
              
              <div class="quick-nav-grid">
                <n-button 
                  v-for="group in menuGroups" 
                  :key="group.id"
                  size="small" 
                  @click="setActiveMenuGroup(group.id)" 
                  class="quick-nav-item"
                  :class="{ 'active': activeMenuGroup === group.id }"
                  :style="{ 
                    '--group-color': group.color,
                    backgroundColor: activeMenuGroup === group.id ? group.color : 'transparent',
                    borderColor: group.color,
                    color: activeMenuGroup === group.id ? 'white' : group.color
                  }">
                  <template #icon>
                    <n-icon size="14">
                      <component :is="getIconComponent(group.icon)" />
                    </n-icon>
                  </template>
                  {{ group.name }}
                </n-button>
              </div>
            </div>

            <!-- 当前分类功能详情 -->
            <div class="tab-content">
              <div class="menu-group">
                <div class="group-header">
                  <n-icon size="18" :style="{ color: currentGroup?.color }">
                    <component :is="getIconComponent(currentGroup?.icon || 'Settings')" />
                  </n-icon>
                  <span>{{ currentGroup?.name || '功能' }}</span>
                  <div class="group-badge">{{ currentGroup?.items?.length || 0 }}</div>
                </div>
                
                <div class="control-grid">
                  <n-tooltip 
                    v-for="item in currentGroup?.items || []" 
                    :key="item.id"
                    placement="bottom" 
                    trigger="hover">
                    <template #trigger>
                      <n-button 
                        @click="executeAction(item.action)" 
                        size="small" 
                        class="grid-item"
                        :style="{ 
                          '--item-color': currentGroup?.color,
                          borderColor: currentGroup?.color + '30'
                        }">
                        <template #icon>
                          <n-icon>
                            <component :is="getIconComponent(item.icon)" />
                          </n-icon>
                        </template>
                        {{ getButtonText(item) }}
                      </n-button>
                    </template>
                    {{ getTooltipText(item) }}
                  </n-tooltip>
                </div>
              </div>
            </div>
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
  transition: all 0.3s ease;

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }

  &.collapsed {
    .n-card {
      padding: 8px 4px;
    }
  }
}

/* 折叠状态的垂直导航 */
.collapsed-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 4px 0;

  .expand-btn {
    margin-bottom: 8px;
    background: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%);
    color: white;
    border: none;
    
    &:hover {
      background: linear-gradient(135deg, #096dd9 0%, #13c2c2 100%);
    }
  }

  .nav-divider {
    width: 24px;
    height: 1px;
    background: rgba(0, 0, 0, 0.1);
    margin: 4px 0;
  }

  .nav-item {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    border: 1px solid transparent;

    &:hover {
      transform: translateX(3px) scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    &.quick-menu-btn {
      background: linear-gradient(135deg, #722ed1 0%, #eb2f96 100%);
      color: white;
      border: none;
      
      &:hover {
        background: linear-gradient(135deg, #531dab 0%, #c41d7f 100%);
        transform: translateX(3px) scale(1.1);
      }
      
      &::after {
        content: '▼';
        position: absolute;
        bottom: 2px;
        right: 2px;
        font-size: 8px;
        opacity: 0.8;
      }
    }
  }

  .tooltip-content {
    .tooltip-title {
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .tooltip-desc {
      font-size: 12px;
      opacity: 0.7;
    }
  }
}

/* 展开状态的菜单 */
.expanded-menu {
  .quick-nav {
    margin-bottom: 16px;
    
    .quick-nav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      .quick-nav-title {
        font-weight: 600;
        font-size: 14px;
        color: #333;
      }
      
      .collapse-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #666;
        
        &:hover {
          color: #1890ff;
        }
      }
    }
    
    .quick-nav-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      
      .quick-nav-item {
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 11px;
        transition: all 0.2s ease;
        border: 1px solid;
        border-radius: 6px;
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        &.active {
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }

  .tab-content {
    min-height: 140px;
    animation: fadeIn 0.3s ease;
  }
}

/* 菜单组样式 */
.menu-group {
  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 10px 14px;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.05) 100%);
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    color: #333;
    border-left: 3px solid var(--group-color, #1890ff);
    
    .group-badge {
      margin-left: auto;
      background: var(--group-color, #1890ff);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
  }
}

/* 网格布局控制 */
.control-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .grid-item {
    height: 50px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 11px;
    transition: all 0.2s ease;
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 4px;
    text-align: center;
    line-height: 1.2;
    word-break: break-all;
    overflow: hidden;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--item-color, #1890ff);
      background: rgba(24, 144, 255, 0.05);
    }

    &.full-width {
      grid-column: 1 / -1;
    }

    /* 图标和文字布局优化 */
    :deep(.n-button__content) {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      width: 100%;
      overflow: hidden;
    }

    /* 文字溢出处理 */
    :deep(.n-button__content > span:last-child) {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      font-size: 10px;
    }
  }
}

/* 折叠状态导航组间距 */
.nav-group {
  margin-bottom: 4px;
}

/* 菜单组样式 */
.menu-group {
  .group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    padding: 8px 12px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 8px;
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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .floating-menu {
    left: 10px;
    top: 60px;

    &:not(.collapsed) {
      .n-card {
        width: 340px !important;
      }

      .quick-nav-grid {
        grid-template-columns: repeat(3, 1fr);
        
        .quick-nav-item {
          height: 32px;
          font-size: 10px;
        }
      }

      .control-grid {
        grid-template-columns: repeat(2, 1fr);
        
        .grid-item {
          height: 45px;
          font-size: 10px;
          
          :deep(.n-button__content > span:last-child) {
            font-size: 9px;
          }
        }
      }
    }
  }

  .menu-toggle {
    top: 10px;
    left: 10px;
  }
}

@media (max-width: 480px) {
  .floating-menu {
    &:not(.collapsed) {
      .n-card {
        width: 300px !important;
      }

      .quick-nav-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .control-grid {
        grid-template-columns: 1fr;

        .grid-item {
          height: 40px;
          
          :deep(.n-button__content > span:last-child) {
            font-size: 9px;
          }
        }
      }
    }
  }
}

/* Naive UI 组件自定义样式 */
:deep(.n-card-header) {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .n-card-header__main {
    font-weight: 600;
    color: #2c3e50;
  }
}

:deep(.n-card__content) {
  padding: 16px;
}

:deep(.n-button) {
  &.n-button--primary-type {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;

    &:hover {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    }
  }

  &.n-button--default-type {
    &:hover {
      background: rgba(103, 194, 58, 0.1);
      border-color: #67c23a;
      color: #67c23a;
    }
  }
}

/* 特殊效果 */
.floating-menu {
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, transparent 30%, rgba(103, 194, 58, 0.1) 50%, transparent 70%);
    border-radius: 12px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
}
</style>