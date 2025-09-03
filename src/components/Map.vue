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
import GlobalVolumetricClouds from '@/postrender/Cloud/GlobalVolumetricClouds'

let viewer: Cesium.Viewer;
let globalClouds: GlobalVolumetricClouds | null = null;
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
    // 隐藏云层
    if (globalClouds) {
      globalClouds.destroy();
      globalClouds = null;
    }
    cloudVisible.value = false;
    message.info('全球体积云已隐藏');
    return;
  }

  try {
    // 创建全球体积云实例 - 使用高可见性配置
    globalClouds = new GlobalVolumetricClouds(viewer, {
      cloudCover: 0.8,              // 高云量确保可见
      cloudBase: 3000,              // 较高的云底
      cloudTop: 10000,              // 较高的云顶
      windSpeedRatio: 0.0001,       // 较慢的风速
      absorptionCoefficient: 0.3,   // 较低的吸收系数使云层更亮
      scatteringCoefficient: 0.4,   // 较高的散射系数
      phaseG: 0.2,
      lightingIntensity: 2.5,       // 高光照强度
      cloudDensityScale: 2.0,       // 高密度确保可见
      noiseScale: 0.0001,           // 大尺度噪声
      timeScale: 0.1                // 慢时间流逝
    });
    
    globalClouds.init();
    cloudVisible.value = true;
    message.success('全球体积云已启用 - 请等待3秒加载');
  } catch (error) {
    message.error('启用云层失败: ' + error);
  }
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
  if (!globalClouds) {
    message.warning('请先启用云层系统');
    return;
  }
  
  // 动态调整天气参数的示例 - 优化可见性
  const weatherPresets = [
    {
      name: '晴朗',
      cloudCover: 0.4,
      windSpeedRatio: 0.00005,
      absorptionCoefficient: 0.2,
      lightingIntensity: 3.0,
      cloudDensityScale: 1.0
    },
    {
      name: '多云',
      cloudCover: 0.7,
      windSpeedRatio: 0.0001,
      absorptionCoefficient: 0.4,
      lightingIntensity: 2.5,
      cloudDensityScale: 1.5
    },
    {
      name: '阴天',
      cloudCover: 0.9,
      windSpeedRatio: 0.0002,
      absorptionCoefficient: 0.6,
      lightingIntensity: 2.0,
      cloudDensityScale: 2.0
    }
  ];
  
  // 随机选择一个天气预设
  const preset = weatherPresets[Math.floor(Math.random() * weatherPresets.length)];
  globalClouds.updateOption(preset);
  
  message.info(`天气已切换至: ${preset.name}`);
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
          <n-button circle type="primary" @click="toggleMenu" class="menu-toggle-btn">
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
    <transition name="menu-slide">
      <div v-if="menuVisible" class="floating-menu" :class="{ 'collapsed': menuCollapsed }">
        <n-card :title="menuCollapsed ? '' : '功能菜单'" size="small" class="menu-card">
          <!-- 菜单头部控制 -->
          <template #header-extra v-if="!menuCollapsed">
            <n-space>
              <n-tooltip placement="bottom" trigger="hover">
                <template #trigger>
                  <n-button size="tiny" quaternary @click="toggleMenuCollapse" class="header-btn">
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
  background: #0a0a0a;
}

/* 菜单切换按钮 - 黑色主题 */
.menu-toggle {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  
  .menu-toggle-btn {
    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
    border: 1px solid #404040;
    color: #ffffff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(20px);
    
    &:hover {
      background: linear-gradient(135deg, #3d3d3d 0%, #2a2a2a 100%);
      border-color: #555555;
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
    }
    
    &:active {
      transform: translateY(0) scale(0.98);
    }
  }
}

/* 悬浮菜单面板 - 黑色主题 */
.floating-menu {
  position: absolute;
  top: 70px;
  left: 20px;
  z-index: 999;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top left;

  /* 自定义滚动条 - 黑色主题 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #404040 0%, #2d2d2d 100%);
    border-radius: 3px;
    
    &:hover {
      background: linear-gradient(135deg, #555555 0%, #404040 100%);
    }
  }

  .menu-card {
    width: 380px;
    background: rgba(20, 20, 20, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    }
  }

  &.collapsed {
    .menu-card {
      width: 64px;
      padding: 8px 4px;
      
      :deep(.n-card__content) {
        padding: 8px 4px;
      }
    }
  }
}

/* 折叠状态的垂直导航 - 黑色主题 */
.collapsed-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 8px 0;

  .expand-btn {
    margin-bottom: 12px;
    background: linear-gradient(135deg, #333333 0%, #1a1a1a 100%);
    color: #ffffff;
    border: 1px solid #404040;
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      background: linear-gradient(135deg, #404040 0%, #2d2d2d 100%);
      border-color: #555555;
      transform: scale(1.05);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    }
  }

  .nav-divider {
    width: 32px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    margin: 8px 0;
  }

  .nav-item {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(30, 30, 30, 0.8);
    backdrop-filter: blur(10px);

    &:hover {
      transform: translateX(4px) scale(1.08);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7);
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(40, 40, 40, 0.9);
    }
    
    &.quick-menu-btn {
      background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
      color: #ffffff;
      border: 1px solid #404040;
      position: relative;
      
      &:hover {
        background: linear-gradient(135deg, #404040 0%, #2d2d2d 100%);
        transform: translateX(4px) scale(1.1);
        border-color: #555555;
      }
      
      &::after {
        content: '⋮';
        position: absolute;
        bottom: 4px;
        right: 4px;
        font-size: 10px;
        opacity: 0.6;
      }
    }
  }

  .tooltip-content {
    .tooltip-title {
      font-weight: 600;
      margin-bottom: 2px;
      color: #ffffff;
    }
    
    .tooltip-desc {
      font-size: 12px;
      opacity: 0.7;
      color: #cccccc;
    }
  }
}

/* 展开状态的菜单 - 黑色主题 */
.expanded-menu {
  .quick-nav {
    margin-bottom: 20px;
    
    .quick-nav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      
      .quick-nav-title {
        font-weight: 600;
        font-size: 15px;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
      
      .collapse-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #cccccc;
        transition: all 0.2s ease;
        
        &:hover {
          color: #ffffff;
          transform: translateX(-2px);
        }
      }
    }
    
    .quick-nav-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      
      .quick-nav-item {
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid;
        border-radius: 10px;
        background: rgba(30, 30, 30, 0.6);
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s ease;
        }
        
        &:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7);
          
          &::before {
            left: 100%;
          }
        }
        
        &.active {
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
          border-color: var(--group-color);
          color: #ffffff;
          background: linear-gradient(135deg, var(--group-color), rgba(0, 0, 0, 0.3));
        }
      }
    }
  }

  .tab-content {
    min-height: 160px;
    animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* 菜单组样式 - 黑色主题 */
.menu-group {
  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding: 16px 18px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
    border-radius: 12px;
    font-weight: 600;
    font-size: 15px;
    color: #ffffff;
    border-left: 4px solid var(--group-color, #666666);
    border: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 60px;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05));
      pointer-events: none;
    }
    
    .group-badge {
      margin-left: auto;
      background: var(--group-color, #666666);
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  }
}

/* 横向滚动布局控制 - 黑色主题 */
.control-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 0;
  
  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #404040 0%, #2d2d2d 100%);
    border-radius: 3px;
    
    &:hover {
      background: linear-gradient(135deg, #555555 0%, #404040 100%);
    }
  }

  .grid-item {
    flex: 0 0 auto;
    min-width: 100px;
    max-width: 140px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 12px;
    text-align: center;
    overflow: hidden;
    background: rgba(30, 30, 30, 0.6);
    backdrop-filter: blur(10px);
    color: #ffffff;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, transparent 0%, var(--item-color, #666666)20 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    &:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8);
      border-color: var(--item-color, #666666);
      background: rgba(40, 40, 40, 0.8);
      
      &::before {
        opacity: 0.1;
      }
    }

    &:active {
      transform: translateY(-1px) scale(0.98);
    }

    /* 横向布局：图标和文字水平排列 */
    :deep(.n-button__content) {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      width: 100%;
      overflow: hidden;
      color: inherit;
    }

    /* 图标大小调整 */
    :deep(.n-button__icon) {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }

    /* 文字自适应，不换行 */
    :deep(.n-button__content > span:last-child) {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      font-size: 11px;
      color: inherit;
      text-align: left;
    }
  }
}

/* 折叠状态导航组间距 */
.nav-group {
  margin-bottom: 6px;
}

/* 头部按钮样式 */
.header-btn {
  color: #cccccc;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
}

/* 过渡动画 - 优化流畅度 */
.menu-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.6, 0, 0.8, 0.4);
}

.menu-slide-enter-from {
  transform: translateX(-40px) scale(0.9);
  opacity: 0;
}

.menu-slide-leave-to {
  transform: translateX(-20px) scale(0.95);
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 - 黑色主题适配 */
@media (max-width: 768px) {
  .floating-menu {
    left: 10px;
    top: 60px;

    &:not(.collapsed) {
      .menu-card {
        width: 340px !important;
      }

      .quick-nav-grid {
        grid-template-columns: repeat(3, 1fr);
        
        .quick-nav-item {
          height: 36px;
          font-size: 10px;
        }
      }

      .control-grid {
        .grid-item {
          min-width: 80px;
          max-width: 120px;
          height: 42px;
          font-size: 11px;
          
          :deep(.n-button__content > span:last-child) {
            font-size: 10px;
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
      .menu-card {
        width: 300px !important;
      }

      .quick-nav-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .control-grid {
        .grid-item {
          min-width: 70px;
          max-width: 100px;
          height: 40px;
          font-size: 10px;
          
          :deep(.n-button__content > span:last-child) {
            font-size: 9px;
          }
        }
      }
    }
  }
}

/* Naive UI 组件自定义样式 - 黑色主题 */
:deep(.n-card) {
  background: transparent !important;
  border: none !important;
}

:deep(.n-card-header) {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);

  .n-card-header__main {
    font-weight: 600;
    color: #ffffff;
    font-size: 16px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
}

:deep(.n-card__content) {
  padding: 20px;
  background: transparent;
}

:deep(.n-button) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.n-button--primary-type {
    background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
    border: 1px solid #404040;
    color: #ffffff;

    &:hover {
      background: linear-gradient(135deg, #404040 0%, #2d2d2d 100%);
      border-color: #555555;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    }
  }

  &.n-button--default-type {
    background: rgba(30, 30, 30, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ffffff;
    
    &:hover {
      background: rgba(40, 40, 40, 0.8);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
  }
  
  &.n-button--quaternary-type {
    background: transparent;
    border: none;
    color: #cccccc;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
  }
}

/* 特殊效果 - 黑色主题霓虹效果 */
.floating-menu {
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: linear-gradient(45deg, 
      transparent 30%, 
      rgba(255, 255, 255, 0.1) 50%, 
      transparent 70%);
    border-radius: 17px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover::before {
    opacity: 1;
    animation: shimmer 2s infinite;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 工具提示样式优化 */
:deep(.n-tooltip__content) {
  background: rgba(20, 20, 20, 0.95) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
}

/* 下拉菜单样式 */
:deep(.n-dropdown-menu) {
  background: rgba(20, 20, 20, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}

:deep(.n-dropdown-option) {
  color: #ffffff !important;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }
}
</style>