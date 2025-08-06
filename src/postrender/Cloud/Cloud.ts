import * as Cesium from 'cesium';

interface CloudOptions {
    viewer: Cesium.Viewer;
    height?: number; // 云层高度（米）
    opacity?: number; // 云层透明度
    rotateSpeed?: number; // 旋转速度
    textureRepeat?: number; // 纹理重复次数
}

export default class Cloud {
    private viewer: Cesium.Viewer;
    private delegate: Cesium.Primitive | null;
    private rotateAmount: number;
    private heading: number;
    private height: number;
    private opacity: number;
    private textureRepeat: number;

    constructor(val: CloudOptions) {
        this.viewer = val.viewer;
        this.delegate = null; // 储存实体
        this.rotateAmount = val.rotateSpeed ?? 0.1; // 降低默认旋转速度
        this.heading = 0;
        this.height = val.height ?? 50000; // 默认高度50km
        this.opacity = val.opacity ?? 0.4; // 默认透明度
        this.textureRepeat = val.textureRepeat ?? 1.0; // 默认纹理重复
    }
    _createPrimitive(): void {
        const _this = this;
        
        // 获取地球椭球体半径
        const earthRadii = this.viewer.scene.globe.ellipsoid.radii;
        
        this.delegate = new Cesium.Primitive({
          appearance: new Cesium.EllipsoidSurfaceAppearance({
            material: new Cesium.Material({
              fabric: {
                type: "Image",
                uniforms: {
                  color: new Cesium.Color(1.0, 1.0, 1.0, this.opacity),
                  image: "/public/image/cloud.jpg",
                  repeat: this.textureRepeat,
                },
                components: {
                  alpha: "texture(image, fract(repeat * materialInput.st)).r * color.a",
                  diffuse: "vec3(1.0)",
                },
              },
            }),
            translucent: true,
            aboveGround: false, // 改为false，使用绝对位置
          }),
          geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.EllipsoidGeometry({
              vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
              // 在地球半径基础上增加高度
              radii: new Cesium.Cartesian3(
                earthRadii.x + this.height,
                earthRadii.y + this.height,
                earthRadii.z + this.height
              ),
            }),
            id: "cloud_layer",
          }),
        });
        
        this.delegate.show = true;
        this.viewer.scene.primitives.add(this.delegate);
        
        // 只有在旋转速度大于0时才添加旋转监听
        if (this.rotateAmount > 0) {
          this.viewer.scene.postRender.addEventListener(this._onRotate, this);
        }
      }
      private _onRotate = (scene: Cesium.Scene, time: Cesium.JulianDate): void => {
        if (this.rotateAmount === 0) {
          return;
        }
        this.heading += this.rotateAmount;
        if (this.heading >= 360 || this.heading <= -360) {
          this.heading = 0;
        }
        if (this.delegate) {
          // 使用地球中心作为旋转中心，但添加适当的变换
          const center = Cesium.Cartesian3.ZERO;
          const heading = Cesium.Math.toRadians(this.heading);
          const pitch = 0;
          const roll = 0;
          
          this.delegate.modelMatrix = Cesium.Matrix4.multiply(
            Cesium.Transforms.headingPitchRollToFixedFrame(
              center,
              new Cesium.HeadingPitchRoll(heading, pitch, roll)
            ),
            Cesium.Matrix4.IDENTITY,
            new Cesium.Matrix4()
          );
        }
      }
    _deletePrimitive(): void {
        this.viewer.scene.postRender.removeEventListener(this._onRotate, this);
        if (this.delegate) {
            this.viewer.scene.primitives.remove(this.delegate);
        }
    }
}
