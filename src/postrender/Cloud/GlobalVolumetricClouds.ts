/**
 * @description 用于创建和管理全球体积云效果, 用Cesium的PostProcessStage实现
 * @author 落叶Rakuyou
 * @date 2025-09-03
 * @version 0.1.0
 * @example
 * const clouds = new GlobalVolumetricClouds(viewer);
 * clouds.init();
 */

import * as Cesium from 'cesium'
import * as dat from 'dat.gui'

interface CloudsOption {
  windSpeedRatio: number
  cloudCover: number
  cloudBase: number
  cloudTop: number
  cloudThickness: number
  cloudBaseRadius: number
  cloudTopRadius: number
  currentWindVectorWC: Cesium.Cartesian3
  maxViewingDistance: number
  absorptionCoeff: number
  scatteringAniso: number
  lightSteps: number
  densitySteps: number
  edgeSoftness: number // 新增：边缘软化程度
}

class GlobalVolumetricClouds {
  private _uniforms: CloudsOption
  private _updateInterval: any
  private _cloudsPostProcessStage: Cesium.PostProcessStage | null
  private _gui: dat.GUI | null
  viewer: Cesium.Viewer
  option: CloudsOption

  constructor(viewer: Cesium.Viewer, option?: Partial<CloudsOption>) {
    this.viewer = viewer

    // 默认配置
    const defaultOption: CloudsOption = {
      windSpeedRatio: 0.0004,
      cloudCover: 0.5,
      cloudBase: 1000,
      cloudTop: 3000,
      cloudThickness: 2000,
      cloudBaseRadius: 6378137 + 1000,
      cloudTopRadius: 6378137 + 3000,
      currentWindVectorWC: new Cesium.Cartesian3(100, 0, 0),
      maxViewingDistance: 500000.0, // 增加到500km
      absorptionCoeff: 0.5,
      scatteringAniso: 0.3,
      lightSteps: 6,
      densitySteps: 60,
      edgeSoftness: 0.1 // 边缘软化程度，默认为云层厚度的10%
    }

    this.option = { ...defaultOption, ...option }
    this._uniforms = { ...this.option }
    this._updateInterval = null
    this._cloudsPostProcessStage = null
    this._gui = null
  }

  /**
   * 初始化云层后处理效果
   */
  init() {
    if (!this.viewer) throw new Error('Cesium viewer is required')

    setTimeout(() => {
      this.addPostProcess()
    }, 3000)
  }

  /**
   * 添加云层后处理效果
   */
  addPostProcess() {
    this._cloudsPostProcessStage = new Cesium.PostProcessStage({
      fragmentShader: this.getFragmentShader(),
      uniforms: {
        realPlanetRadius: 6378137,
        windSpeedRatio: this._uniforms.windSpeedRatio,
        windVector: this._uniforms.currentWindVectorWC,
        cloudCover: this._uniforms.cloudCover,
        cloudBase: this._uniforms.cloudBase,
        cloudTop: this._uniforms.cloudTop,
        cloudThickness: this._uniforms.cloudThickness,
        cloudBaseRadius: this._uniforms.cloudBaseRadius,
        cloudTopRadius: this._uniforms.cloudTopRadius,
        absorptionCoeff: this._uniforms.absorptionCoeff,
        scatteringAniso: this._uniforms.scatteringAniso,
        lightSteps: this._uniforms.lightSteps,
        densitySteps: this._uniforms.densitySteps,
        edgeSoftness: this._uniforms.edgeSoftness,
        maxViewingDistance: this._uniforms.maxViewingDistance
      }
    })

    this.viewer.scene.postProcessStages.add(this._cloudsPostProcessStage)
    this.startUpdateLoop()
    this.createGUI()
  }

  /**
   * 启动更新循环
   */
  startUpdateLoop() {
    this._updateInterval = setInterval(() => {
      this.update()
    }, 1000)
  }

  /**
   * 更新云层参数
   */
  update() {
    //@ts-expect-error
    if (!this._cloudsPostProcessStage || !this.viewer.scene.context._us.globeDepthTexture) return

    this._cloudsPostProcessStage.uniforms.windVector = this._uniforms.currentWindVectorWC
    this._cloudsPostProcessStage.uniforms.cloudCover = this._uniforms.cloudCover

    // 相机所在位置的地球半径
    let cameraPosition = this.viewer.camera.positionCartographic
    let cartesian = this.viewer.scene.globe.ellipsoid.cartographicToCartesian(
      new Cesium.Cartographic(cameraPosition.longitude, cameraPosition.latitude, 0),
      new Cesium.Cartesian3()
    )
    const realPlanetRadius = Cesium.Cartesian3.magnitude(cartesian)
    const cloudThickness = this._uniforms.cloudTop - this._uniforms.cloudBase
    const cloudBaseRadius = realPlanetRadius + this._uniforms.cloudBase
    const cloudTopRadius = cloudBaseRadius + cloudThickness

    this._cloudsPostProcessStage.uniforms.realPlanetRadius = realPlanetRadius
    this._cloudsPostProcessStage.uniforms.cloudBase = this._uniforms.cloudBase
    this._cloudsPostProcessStage.uniforms.cloudTop = this._uniforms.cloudTop
    this._cloudsPostProcessStage.uniforms.cloudThickness = cloudThickness
    this._cloudsPostProcessStage.uniforms.cloudBaseRadius = cloudBaseRadius
    this._cloudsPostProcessStage.uniforms.cloudTopRadius = cloudTopRadius
    
    // 更新新的参数
    this._cloudsPostProcessStage.uniforms.absorptionCoeff = this._uniforms.absorptionCoeff
    this._cloudsPostProcessStage.uniforms.scatteringAniso = this._uniforms.scatteringAniso
    this._cloudsPostProcessStage.uniforms.lightSteps = this._uniforms.lightSteps
    this._cloudsPostProcessStage.uniforms.densitySteps = this._uniforms.densitySteps
    this._cloudsPostProcessStage.uniforms.edgeSoftness = this._uniforms.edgeSoftness
    this._cloudsPostProcessStage.uniforms.maxViewingDistance = this._uniforms.maxViewingDistance
  }

  /**
   * 创建GUI控制面板
   */
  createGUI() {
    if (!this._cloudsPostProcessStage) return

    this._gui = new dat.GUI()
    const folder = this._gui.addFolder('云层')
    const qualityFolder = this._gui.addFolder('质量设置')
    const lightingFolder = this._gui.addFolder('光照设置')

    // 基础云层参数
    folder
      .add(this._uniforms, 'windSpeedRatio', 0, 0.0008)
      .name('风速')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.windSpeedRatio = this._uniforms.windSpeedRatio
        }
      })

    folder
      .add(this._uniforms, 'cloudCover', 0, 1)
      .name('云量')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.cloudCover = this._uniforms.cloudCover
        }
      })

    folder
      .add(this._uniforms, 'cloudBase', 0, 100000)
      .name('云底高度')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.cloudBase = this._uniforms.cloudBase
          this.update()
        }
      })

    folder
      .add(this._uniforms, 'cloudTop', 0, 100000)
      .name('云顶高度')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.cloudTop = this._uniforms.cloudTop
          this.update()
        }
      })

    folder
      .add(this._uniforms, 'maxViewingDistance', 100000, 500000)
      .name('最大可视距离')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.maxViewingDistance = this._uniforms.maxViewingDistance
        }
      })

    folder
      .add(this._uniforms, 'edgeSoftness', 0.05, 0.3)
      .name('边缘软化')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.edgeSoftness = this._uniforms.edgeSoftness
        }
      })

    // 质量设置
    qualityFolder
      .add(this._uniforms, 'densitySteps', 40, 120)
      .name('密度采样步数')
      .step(1)
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.densitySteps = this._uniforms.densitySteps
        }
      })

    qualityFolder
      .add(this._uniforms, 'lightSteps', 4, 12)
      .name('光照采样步数')
      .step(1)
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.lightSteps = this._uniforms.lightSteps
        }
      })

    // 光照设置
    lightingFolder
      .add(this._uniforms, 'absorptionCoeff', 0.1, 2.0)
      .name('吸收系数')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.absorptionCoeff = this._uniforms.absorptionCoeff
        }
      })

    lightingFolder
      .add(this._uniforms, 'scatteringAniso', -0.8, 0.8)
      .name('散射各向异性')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.scatteringAniso = this._uniforms.scatteringAniso
        }
      })

    folder.open()
    qualityFolder.open()
    lightingFolder.open()
  }

  /**
   * fragmentShader代码
   */
  getFragmentShader(): string {
    return /*glsl*/`
   uniform sampler2D colorTexture;
   in vec2 v_textureCoordinates;
   
   uniform float realPlanetRadius;
   uniform float windSpeedRatio;
   uniform float cloudCover;
   uniform float cloudBase;
   uniform float cloudTop;
   uniform vec3 windVector;
   uniform float cloudThickness;
   uniform float cloudBaseRadius;
   uniform float cloudTopRadius;
   uniform float absorptionCoeff;
   uniform float scatteringAniso;
   uniform float lightSteps;
   uniform float densitySteps;
   uniform float edgeSoftness;
   uniform float maxViewingDistance;
   
   const float PI = 3.14159265359;
   const float TWO_PI = 6.28318530718;
   const float FOUR_PI = 12.5663706144;
   
   // Beer's Law - 更物理准确的光照衰减
   float BeersLaw(float dist, float absorption) {
    return exp(-dist * absorption);
   }
   
   // Henyey-Greenstein相位函数 - 更真实的散射
   float HenyeyGreenstein(float g, float mu) {
    float gg = g * g;
    return (1.0 / (4.0 * PI)) * ((1.0 - gg) / pow(1.0 + gg - 2.0 * g * mu, 1.5));
   }
   
   // 射线与球体相交
   vec2 raySphereIntersect(vec3 r0, vec3 rd, float sr) {
    float a = dot(rd, rd);
    float b = 2.0 * dot(rd, r0);
    float c = dot(r0, r0) - (sr * sr);
    float d = (b * b) - 4.0 * a * c;
    if (d < 0.0) return vec2(-1.0, -1.0);
    float squaredD = sqrt(d);
    return vec2(
     (-b - squaredD) / (2.0 * a),
     (-b + squaredD) / (2.0 * a)
    );
   }
   
   float saturate(float value) {
    return clamp(value, 0.0, 1.0);
   }
   
   // 改进的hash函数
   float hash(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
   }
   
   float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
   }
   
   // 改进的噪声函数 - 添加更多变化
   float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = p.x + p.y * 157.0 + 113.0 * p.z;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                   mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
   }
   
   // 改进的FBM噪声 - 添加涡旋效果
   float fbm(vec3 p, bool lowRes) {
    float f = 0.0;
    float scale = 0.5;
    float factor = 2.0;
    
    int octaves = lowRes ? 2 : 4;
    
    // 添加旋转矩阵以增加复杂性
    mat3 rotMatrix = mat3(
     0.0, 0.8, 0.6,
     -0.8, 0.36, -0.48,
     -0.6, -0.48, 0.64
    );
    
    for (int i = 0; i < 4; i++) {
     if (i >= octaves) break;
     f += scale * noise(p);
     p = rotMatrix * p * factor; // 旋转采样位置
     scale *= 0.5;
    }
    
    return f;
   }
   
   // 改进的云密度函数 - 添加边缘软化
   float cloudDensity(vec3 p, vec3 wind, bool lowRes, out float heightRatio) {
    if (cloudCover <= 0.01) {
     heightRatio = 0.0;
     return 0.0;
    }
    
    float height = length(p) - realPlanetRadius;
    heightRatio = saturate((height - cloudBase) / cloudThickness);
    
    // 边缘软化 - 使用可配置的软化参数
    float edgeFadeDistance = cloudThickness * edgeSoftness;
    float bottomFade = saturate((height - cloudBase) / edgeFadeDistance);
    float topFade = saturate((cloudTop - height) / edgeFadeDistance);
    float edgeFactor = bottomFade * topFade;
    
    // 应用风向偏移
    vec3 samplePos = p * 0.00005 + wind * 0.1;
    
    // 获取基础噪声
    float density = fbm(samplePos, lowRes) * 0.5 + 0.5;
    
    // 根据云量调整密度阈值
    float threshold = 1.0 - cloudCover;
    density = saturate((density - threshold) / max(1.0 - threshold, 0.1)); // 防止除零
    
    // 改进高度衰减 - 使云层分布更均匀
    float heightFactor = 1.0;
    if (heightRatio <= 0.5) {
     heightFactor = smoothstep(0.0, 0.5, heightRatio);
    } else {
     heightFactor = smoothstep(1.0, 0.5, heightRatio);
    }
    heightFactor = max(heightFactor, 0.2); // 确保最小密度
    
    density *= heightFactor;
    
    // 应用边缘软化
    density *= edgeFactor;
    
    // 确保最小密度，防止云层完全消失
    density = max(density, 0.0);
    
    return density;
   }
   
   // 光照行进 - 改进边界处理
   float lightmarch(vec3 position, vec3 lightDir, float lightSteps) {
    float totalDensity = 0.0;
    float stepSize = 300.0;
    
    // 扩展光照采样范围
    float extendedCloudBase = cloudBase - cloudThickness * edgeSoftness;
    float extendedCloudTop = cloudTop + cloudThickness * edgeSoftness;
    
    for (int step = 0; step < 12; step++) {
     if (float(step) >= lightSteps) break;
     
     position += lightDir * stepSize;
     
     float height = length(position) - realPlanetRadius;
     // 使用扩展边界进行检查
     if (height < extendedCloudBase || height > extendedCloudTop) break;
     
     float heightRatio;
     float lightSample = cloudDensity(position, windVector, true, heightRatio);
     totalDensity += lightSample * stepSize * 0.001;
    }
    
    // 改进光照计算，确保低吸收系数时有足够的光照
    float effectiveAbsorption = max(absorptionCoeff * 0.5, 0.05); // 光照采样时使用较低的吸收系数
    float transmittance = BeersLaw(totalDensity, effectiveAbsorption);
    
    // 在低密度区域增强光照
    float lightBoost = 1.0 + (1.0 - saturate(totalDensity)) * 0.5;
    
    return saturate(transmittance * lightBoost);
   }
   
   // 主要的云渲染函数 - 改进边界处理
   vec4 calculate_clouds(vec3 start, vec3 dir, float maxDistance, vec3 lightDir, vec3 wind) {
    // 射线-球体相交计算
    vec2 toTop = raySphereIntersect(start, dir, cloudTopRadius);
    vec2 toBase = raySphereIntersect(start, dir, cloudBaseRadius);
    
    float startHeight = length(start) - realPlanetRadius;
    float tmin = 100.0;
    float tmax = min(maxDistance, maxViewingDistance);
    
    // 添加扩展边界以实现更柔和的过渡
    float extendedCloudBase = cloudBase - cloudThickness * edgeSoftness;
    float extendedCloudTop = cloudTop + cloudThickness * edgeSoftness;
    float extendedBaseRadius = realPlanetRadius + extendedCloudBase;
    float extendedTopRadius = realPlanetRadius + extendedCloudTop;
    
    vec2 toExtendedTop = raySphereIntersect(start, dir, extendedTopRadius);
    vec2 toExtendedBase = raySphereIntersect(start, dir, extendedBaseRadius);
    
    // 使用扩展边界进行相交计算
    if (startHeight > extendedCloudTop) {
     if (toExtendedTop.x < 0.0) return vec4(0.0);
     tmin = max(tmin, toExtendedTop.x);
     if (toExtendedBase.x > 0.0) {
      tmax = min(tmax, toExtendedBase.x);
     } else {
      tmax = min(tmax, toExtendedTop.y);
     }
    } else if (startHeight < extendedCloudBase) {
     if (toExtendedBase.y < 0.0) return vec4(0.0);
     tmin = max(tmin, toExtendedBase.y);
     tmax = min(tmax, toExtendedTop.y);
    } else {
     if (toExtendedBase.x > 0.0) {
      tmax = min(tmax, toExtendedBase.x);
     } else {
      tmax = min(tmax, toExtendedTop.y);
     }
    }
    
    if (tmax <= tmin) return vec4(0.0);
    
    // 动态步长
    float stepSize = (tmax - tmin) / densitySteps;
    stepSize = max(stepSize, 50.0);
    
    // 时间噪声偏移 - 减少条带伪影
    float timeOffset = hash(gl_FragCoord.xy * 0.1 + czm_frameNumber * 0.01) * stepSize;
    float distance = tmin + timeOffset;
    
    float totalTransmittance = 1.0;
    vec3 lightAccumulation = vec3(0.0);
    
    // Henyey-Greenstein相位函数
    float phase = HenyeyGreenstein(scatteringAniso, dot(dir, lightDir));
    
    for (int i = 0; i < 120; i++) {
     if (distance >= tmax || float(i) >= densitySteps) break;
     
     vec3 position = start + dir * distance;
     float height = length(position) - realPlanetRadius;
     
     // 只在实际云层范围内计算密度
     if (height >= extendedCloudBase && height <= extendedCloudTop) {
      float heightRatio;
      float density = cloudDensity(position, wind, false, heightRatio);
      
      if (density > 0.001) { // 降低密度阈值，让更多的云能够被渲染
       // 计算光照传输
       float lightTransmittance = lightmarch(position, lightDir, lightSteps);
       
       // 改进散射颜色计算
       vec3 baseCloudColor = vec3(1.0, 1.0, 1.0); // 基础云颜色为白色
       vec3 scatterColor = czm_lightColor * lightTransmittance * phase;
       
       // 混合基础颜色和散射颜色
       vec3 finalCloudColor = mix(baseCloudColor * 0.3, scatterColor, lightTransmittance);
       
       // 调整密度衰减计算，使低吸收系数时云层更明亮
       float effectiveDensity = density * stepSize * 0.01;
       float stepTransmittance = BeersLaw(effectiveDensity, max(absorptionCoeff, 0.1)); // 确保最小吸收系数
       
       // 计算散射强度，低吸收系数时增强散射
       float scatteringStrength = 1.0 + (1.0 - saturate(absorptionCoeff)) * 2.0;
       
       // 改进距离衰减 - 使用更柔和的衰减函数
       float softDistanceFactor = 1.0 / (1.0 + distance * distance / (maxViewingDistance * maxViewingDistance * 0.25));
       float finalDensity = density * softDistanceFactor;
       
       // 累积光照
       lightAccumulation += totalTransmittance * finalDensity * finalCloudColor * stepSize * 0.01 * scatteringStrength;
       
       // 更新透射率
       totalTransmittance *= stepTransmittance;
       
       // 放宽早期退出条件，防止云层提前消失
       if (totalTransmittance < 0.005) break;
      }
     }
     
     distance += stepSize;
    }
    
    float alpha = 1.0 - totalTransmittance;
    return vec4(lightAccumulation, alpha);
   }
   
   void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    
    // 获取深度信息
    vec4 rawDepthColor = texture(czm_globeDepthTexture, v_textureCoordinates);
    float depth = czm_unpackDepth(rawDepthColor);
    if (depth == 0.0) {
     depth = 1.0;
    }
    
    // 计算世界坐标
    vec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
    vec4 worldCoordinate = czm_inverseView * positionEC;
    vec3 vWorldPosition = worldCoordinate.xyz / worldCoordinate.w;
    
    vec3 posToEye = vWorldPosition - czm_viewerPositionWC;
    vec3 direction = normalize(posToEye);
    vec3 lightDirection = normalize(czm_sunPositionWC);
    
    float distance = length(posToEye);
    if (depth == 1.0) {
     distance = maxViewingDistance;
    }
    
    // 计算风向偏移
    vec3 wind = windVector * czm_frameNumber * windSpeedRatio;
    
    // 渲染云层
    vec4 clouds = calculate_clouds(
     czm_viewerPositionWC,
     direction,
     distance,
     lightDirection,
     wind
    );
    
    // 增强云的亮度和对比度
    if (clouds.a > 0.0) {
     // 根据吸收系数调整亮度增强
     float brightnessBoost = 1.5 + (1.0 - saturate(absorptionCoeff)) * 1.5; // 低吸收系数时更亮
     clouds.rgb *= brightnessBoost;
     
     // 添加环境光，确保云层有基础亮度
     vec3 ambientColor = vec3(0.4, 0.45, 0.55) * 0.3;
     clouds.rgb += ambientColor * clouds.a;
     
     // 确保云层颜色不会过暗
     clouds.rgb = max(clouds.rgb, vec3(0.1) * clouds.a);
     
     // 应用云层到场景
     color.rgb = mix(color.rgb, clouds.rgb, clouds.a);
    }
    
    out_FragColor = color;
   }
    `
  }

  /**
   * 更新云层配置
   */
  updateOption(option: Partial<CloudsOption>) {
    this._uniforms = { ...this._uniforms, ...option }
    this.update()
  }

  /**
   * 销毁云层效果
   */
  destroy() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval)
      this._updateInterval = null
    }

    if (this._cloudsPostProcessStage) {
      this.viewer.scene.postProcessStages.remove(this._cloudsPostProcessStage)
      this._cloudsPostProcessStage = null
    }

    if (this._gui) {
      this._gui.destroy()
      this._gui = null
    }
  }

  /**
   * 显示/隐藏云层
   */
  setVisible(visible: boolean) {
    if (this._cloudsPostProcessStage) {
      this._cloudsPostProcessStage.enabled = visible
    }
  }

  /**
   * 获取当前云层配置
   */
  getUniforms(): CloudsOption {
    return { ...this._uniforms }
  }

  /**
   * 设置风向
   */
  setWindVector(windVector: Cesium.Cartesian3) {
    this._uniforms.currentWindVectorWC = windVector
    if (this._cloudsPostProcessStage) {
      this._cloudsPostProcessStage.uniforms.windVector = windVector
    }
  }

  /**
   * 设置云量
   */
  setCloudCover(cloudCover: number) {
    this._uniforms.cloudCover = cloudCover
    if (this._cloudsPostProcessStage) {
      this._cloudsPostProcessStage.uniforms.cloudCover = cloudCover
    }
  }

  /**
   * 设置风速
   */
  setWindSpeedRatio(windSpeedRatio: number) {
    this._uniforms.windSpeedRatio = windSpeedRatio
    if (this._cloudsPostProcessStage) {
      this._cloudsPostProcessStage.uniforms.windSpeedRatio = windSpeedRatio
    }
  }

  /**
   * 设置渲染质量
   */
  setRenderQuality(densitySteps: number, lightSteps: number) {
    this._uniforms.densitySteps = densitySteps
    this._uniforms.lightSteps = lightSteps
    if (this._cloudsPostProcessStage) {
      this._cloudsPostProcessStage.uniforms.densitySteps = densitySteps
      this._cloudsPostProcessStage.uniforms.lightSteps = lightSteps
    }
  }

  /**
   * 设置光照参数
   */
  setLightingParams(absorptionCoeff: number, scatteringAniso: number) {
    this._uniforms.absorptionCoeff = absorptionCoeff
    this._uniforms.scatteringAniso = scatteringAniso
    if (this._cloudsPostProcessStage) {
      this._cloudsPostProcessStage.uniforms.absorptionCoeff = absorptionCoeff
      this._cloudsPostProcessStage.uniforms.scatteringAniso = scatteringAniso
    }
  }

  /**
   * 获取当前渲染质量设置
   */
  getRenderQuality() {
    return {
      densitySteps: this._uniforms.densitySteps,
      lightSteps: this._uniforms.lightSteps
    }
  }

  /**
   * 获取当前光照参数
   */
  getLightingParams() {
    return {
      absorptionCoeff: this._uniforms.absorptionCoeff,
      scatteringAniso: this._uniforms.scatteringAniso
    }
  }
}

export default GlobalVolumetricClouds

