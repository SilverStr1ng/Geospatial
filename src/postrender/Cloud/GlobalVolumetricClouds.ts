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
      cloudCover: 0.63,
      cloudBase: 200,
      cloudTop: 900,
      cloudThickness: 7000,
      cloudBaseRadius: 6378137 + 2000,
      cloudTopRadius: 6378137 + 6000,
      currentWindVectorWC: new Cesium.Cartesian3(100, 0, 0),
      maxViewingDistance: 500000.0
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
  }

  /**
   * 创建GUI控制面板
   */
  createGUI() {
    if (!this._cloudsPostProcessStage) return

    this._gui = new dat.GUI()
    const folder = this._gui.addFolder('云层')

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
      .add(this._uniforms, 'cloudThickness', 0, 10000)
      .name('云层厚度')
      .onChange(() => {
        this.update()
      })

    folder
      .add(this._uniforms, 'maxViewingDistance', 100000, 500000)
      .name('最大可视距离')
      .onChange(() => {
        if (this._cloudsPostProcessStage) {
          this._cloudsPostProcessStage.uniforms.maxViewingDistance = this._uniforms.maxViewingDistance
        }
      })

    folder.open()
  }

  /**
   * fragmentShader代码
   */
  getFragmentShader(): string {
    return /*glsl*/`
      precision highp float; 
   uniform float realPlanetRadius; //地球半径
    uniform float windSpeedRatio;//风速
   uniform float cloudCover;//云量
   uniform float cloudBase;//云的底部高度
   uniform float cloudTop;//云的顶部高度
   uniform vec3 windVector;//方向
   uniform float cloudThickness; //云层厚度
   uniform float cloudBaseRadius;//云层底部半径
   uniform float cloudTopRadius; //云层顶部半径
   const float PI = 3.14159265359;
   const float TWO_PI = 6.28318530718;
   const float FOUR_PI = 12.5663706144;
   #define CLOUDS_MAX_LOD 1
   #define CLOUDS_MARCH_STEP 500.0 //外部每次步进
   #define CLOUDS_DENS_MARCH_STEP 100.0 //云内每次步进
   #define MAXIMUM_CLOUDS_STEPS 300 //最大步进次数
   #define CLOUDS_MAX_VIEWING_DISTANCE 250000.0
   //射线与球体相交 可参考 https://zhuanlan.zhihu.com/p/645281439
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
   float saturate (float value) {
    return clamp(value, 0.0, 1.0);
   }
   float isotropic() {
    return 0.07957747154594767; //1.0 / (4.0 * PI);
   }
   float rayleigh(float costh) {
    return (3.0 / (16.0 * PI)) * (1.0 + pow(costh, 2.0));
   }
   float Schlick(float k, float costh) {
    return (1.0 - k * k) / (FOUR_PI * pow(1.0 - k * costh, 2.0));
   } 
   float g = 0.9;
   float hash(float p) {
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
   }
   //噪声
   float noise(in vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0 - 2.0*f);
    float n = p.x + p.y*157.0 + 113.0*p.z;
    return mix(mix(mix( hash(n+ 0.0), hash(n+ 1.0),f.x),
    mix( hash(n+157.0), hash(n+158.0),f.x),f.y),
    mix(mix( hash(n+113.0), hash(n+114.0),f.x),
    mix(hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
   }
   //云的密度
   float cloudDensity(vec3 p, vec3 wind, int lod, inout float heightRatio) {
    float finalCoverage = cloudCover;
    if (finalCoverage <= 0.1) {
     return 0.0;
    }
    float height = length(p) - realPlanetRadius;
    heightRatio = (height - cloudBase) / cloudThickness;
    float positionResolution = 0.002;
    p = p * positionResolution + wind;
    float shape = noise(p * 0.3);
    float shapeHeight = noise(p * 0.05);
    float bn = 0.50000 * noise(p); p = p * 2.0;
    if( lod>=1 ) {
     bn += 0.20000 * noise(p); p = p * 2.11;
    }
    float cumuloNimbus = saturate((shapeHeight - 0.5) * 2.0);
    cumuloNimbus *= saturate(1.0 - pow(heightRatio - 0.5, 2.0) * 4.0);
    float cumulus = saturate(1.0 - pow(heightRatio - 0.25, 2.0) * 25.0) * shapeHeight;
    float stratoCumulus = saturate(1.0 - pow(heightRatio - 0.12, 2.0) * 60.0) * (1.0 - shapeHeight);
    float dens = saturate(stratoCumulus + cumulus + cumuloNimbus) * 2.0 * finalCoverage;
    dens -= 1.0 - shape;
    dens -= bn;
    return clamp(dens, 0.0, 1.0);
   }
   in vec2 v_textureCoordinates;
   vec3 skyAmbientColor = vec3(0.705, 0.850, 0.952); //0.219, 0.380, 0.541
   vec3 groundAmbientColor = vec3(0.741, 0.898, 0.823); //0.639, 0.858, 0.721
   float distanceQualityR = 0.00005; // LOD/quality ratio
   float minDistance = 10.0; // avoid cloud in cockpit 
   vec4 calculate_clouds(
   vec3 start,
   vec3 dir,
   float maxDistance,
   vec3 light_dir,
   vec3 wind
   ) {
    vec4 cloud = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 toTop = raySphereIntersect(start, dir, cloudTopRadius);
    vec2 toCloudBase = raySphereIntersect(start, dir, cloudBaseRadius);
    float startHeight = length(start) - realPlanetRadius;
    float absoluteMaxDistance = CLOUDS_MAX_VIEWING_DISTANCE;
    float tmin = minDistance;
    float tmax = maxDistance;
    if (startHeight > cloudTop) {
     if (toTop.x < 0.0) return vec4(0.0); // no intersection with cloud layer
      tmin = toTop.x;
     if (toCloudBase.x > 0.0) {
      tmax = min(toCloudBase.x, maxDistance);
     }
     else {
      tmax = min(toTop.y, maxDistance);
     }
    } else if (startHeight < cloudBase) {
     tmin = toCloudBase.y;
     tmax = min(toTop.y, maxDistance);
    } else {
     if (toCloudBase.x > 0.0) {
      tmax = min(toCloudBase.x, maxDistance);
     }
     else {
      tmax = min(toTop.y, maxDistance);
     }
    }
    tmin = max(tmin, minDistance);
    tmax = min(tmax, absoluteMaxDistance);
    if (tmax < tmin) return vec4(0.0); // object obstruction
    float rayLength = tmax - tmin;//步进总距离
    float longMarchStep = rayLength / float(MAXIMUM_CLOUDS_STEPS);//步进距离/步进次数=每次步进的距离
    longMarchStep = max(longMarchStep, CLOUDS_MARCH_STEP);//每次步进多少
    float shortMarchStep = CLOUDS_DENS_MARCH_STEP;
    float numberApproachSteps = (CLOUDS_MARCH_STEP / CLOUDS_DENS_MARCH_STEP) * 2.0;
    float distance = tmin;//
    float dens = 0.0;
    float marchStep;
    float lastDensity; 
    float kInScattering = 0.99;
    float dotLightRay = dot(dir, light_dir);
    float inScattering = Schlick(kInScattering, dotLightRay);
    float outScattering = isotropic(); 
    float sunScatteringPhase = mix(outScattering, inScattering, dotLightRay);
    float ambientScatteringPhase = isotropic();
    bool inCloud = false;
    float stepsBeforeExitingCloud = 0.0;
    for (int i = 0; i < MAXIMUM_CLOUDS_STEPS; i++) {
     vec3 position = start + dir * distance;
     int qualityRatio = int(distance * distanceQualityR);
     int lod = CLOUDS_MAX_LOD - qualityRatio;
     float heightRatio;
     if (inCloud == true) {
      marchStep = shortMarchStep;
     } else {
      marchStep = longMarchStep;
      lod = 0;
     }
     dens = cloudDensity(position, wind, lod, heightRatio);
     if(dens > 0.01) {
      if (inCloud != true) {
       inCloud = true;
       stepsBeforeExitingCloud = numberApproachSteps;
       distance = clamp(distance - CLOUDS_MARCH_STEP, tmin, tmax); // 第一次进入云 回退一步
       continue;
      }
      float deltaDens = clamp((dens - lastDensity) * 10.0, -1.0, 1.0);
      float lighting = (abs(deltaDens - dotLightRay) / 2.0) * clamp((heightRatio - 0.02) * 20.0, 0.5, 1.0);
      lastDensity = dens;
      float scatteringCoeff = 0.15 * dens;
      float extinctionCoeff = 0.01 * dens;
      cloud.a *= exp(-extinctionCoeff * marchStep);
      float sunIntensityAtSurface = clamp(0.2 - dens, 0.0, 1.0);
      vec3 sunLight = lighting * czm_lightColor * sunIntensityAtSurface * czm_lightColor.z;
      vec3 ambientSun = czm_lightColor * sunIntensityAtSurface * czm_lightColor.z * isotropic();
      vec3 skyAmbientLight = (skyAmbientColor * czm_lightColor.z + ambientSun);
      vec3 groundAmbientLight = (groundAmbientColor * czm_lightColor.z * 0.5 + ambientSun);
      vec3 ambientLight = mix(groundAmbientLight, skyAmbientLight, heightRatio);
      vec3 stepScattering = scatteringCoeff * marchStep * (sunScatteringPhase * sunLight + ambientScatteringPhase * ambientLight);
      cloud.rgb += cloud.a * stepScattering;
      if (cloud.a < 0.01) {
       cloud.a = 0.0;
       break;
      }
     } else {
      if (stepsBeforeExitingCloud > 0.0) {
       stepsBeforeExitingCloud--;
      }
      else {
       inCloud = false;
      }
     }
     distance += marchStep;
     //步进距离超出总的距离 退出
     if (distance > tmax) {
      break;
     }
    }
    cloud.a = (1.0 - cloud.a);
    return cloud;
   }
   uniform sampler2D colorTexture;
   void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    vec4 rawDepthColor = texture(czm_globeDepthTexture, v_textureCoordinates);
    float depth = czm_unpackDepth(rawDepthColor);
    if (depth == 0.0) {
     depth = 1.0; 
    }
    vec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
    vec4 worldCoordinate = czm_inverseView * positionEC;
    vec3 vWorldPosition = worldCoordinate.xyz / worldCoordinate.w;
    vec3 posToEye = vWorldPosition - czm_viewerPositionWC;
    vec3 direction = normalize(posToEye);
    vec3 lightDirection = normalize(czm_sunPositionWC);
    float distance = length(posToEye);
    if (depth == 1.0) {
     distance = CLOUDS_MAX_VIEWING_DISTANCE;
    }
    vec3 wind = windVector * czm_frameNumber * windSpeedRatio;
    vec4 clouds = calculate_clouds(
     czm_viewerPositionWC, // the position of the camera
     direction, // the camera vector (ray direction of this pixel)
     distance, // max dist, essentially the scene depth
     lightDirection, // light direction
     wind
    );
    clouds.rgb *= 3.0;
    color = mix(color, clouds, clouds.a * clouds.a );
    float exposure = 1.2;
    color = vec4(1.0 - exp(-exposure * color)); 
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
}

export default GlobalVolumetricClouds

