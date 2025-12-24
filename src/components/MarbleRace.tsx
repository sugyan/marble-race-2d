import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// より彩度の高いビビッドな色（レインボー + 追加色）
const COLORS = [
  '#FF0066', // ビビッドマゼンタ
  '#FF3300', // ビビッドオレンジレッド
  '#FFFF00', // ピュアイエロー
  '#00FF00', // ピュアグリーン
  '#00FFFF', // シアン
  '#0066FF', // ビビッドブルー
  '#9900FF', // ビビッドパープル
  '#FF00FF', // マゼンタ
  '#FF6600', // ビビッドオレンジ
  '#00FF99', // スプリンググリーン
  '#FF0099', // ディープピンク
  '#FFCC00', // ゴールデンイエロー
  '#0099FF', // スカイブルー
  '#CC00FF', // ビビッドバイオレット
  '#00FFCC', // ターコイズ
  '#FF9900', // アンバー
  '#99FF00', // チャートリュース
  '#FF0033', // クリムゾン
  '#00CCFF', // ディープスカイブルー
  '#FF33CC', // ホットピンク
];

interface Ball {
  id: number;
  body: Matter.Body;
  color: string;
  finishTime?: number;
}

const MarbleRace = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const ballsRef = useRef<Ball[]>([]);

  const [ranking, setRanking] = useState<Ball[]>([]);

  const createCourse = (engine: Matter.Engine, width: number, height: number) => {
    const { World, Bodies } = Matter;

    // 壁（下に向かって狭くなる漏斗状 - 階段状に実装）
    const walls = [];
    const funnelBottomWidth = width * 0.5; // 下部の幅
    const segments = 8; // セグメント数

    // 左側の階段状の壁
    for (let i = 0; i < segments; i++) {
      const yStart = (height / segments) * i;
      const yEnd = (height / segments) * (i + 1);
      const y = (yStart + yEnd) / 2;

      // 上から下に向かって、徐々に右に移動
      const xOffset = ((width - funnelBottomWidth) / 2) * (i / segments);
      const x = xOffset;

      walls.push(
        Bodies.rectangle(x, y, 40, height / segments + 10, {
          isStatic: true,
          friction: 0.001,
          restitution: 0.8,
          render: { fillStyle: '#666666' }
        })
      );
    }

    // 右側の階段状の壁
    for (let i = 0; i < segments; i++) {
      const yStart = (height / segments) * i;
      const yEnd = (height / segments) * (i + 1);
      const y = (yStart + yEnd) / 2;

      // 上から下に向かって、徐々に左に移動
      const xOffset = ((width - funnelBottomWidth) / 2) * (i / segments);
      const x = width - xOffset;

      walls.push(
        Bodies.rectangle(x, y, 40, height / segments + 10, {
          isStatic: true,
          friction: 0.001,
          restitution: 0.8,
          render: { fillStyle: '#666666' }
        })
      );
    }

    // ゴールライン（緑色の線）
    const goalLine = Bodies.rectangle(width / 2, height - 30, width, 10, {
      isStatic: true,
      isSensor: true,  // 衝突判定はあるが物理的な衝突はしない
      label: 'goal',
      render: {
        fillStyle: '#00FF00'  // 緑色
      }
    });

    // プラットフォーム（幾何学的パターンをランダムに選択、形状も多様に）
    const platforms = [];
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    // 幾何学的パターンをランダムに選択
    const patterns = ['spiral', 'radial', 'grid', 'symmetric'];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const numPlatforms = 6 + Math.floor(Math.random() * 4); // 6-9個に減少

    // ランダムな形状を生成するヘルパー関数
    const createRandomShape = (x: number, y: number, angle: number) => {
      const shapeType = Math.floor(Math.random() * 3);
      const size = width * (0.15 + Math.random() * 0.1); // サイズを大きく

      const baseOptions = {
        isStatic: true,
        angle: angle,
        friction: 0.001,
        restitution: 0.8,
        render: { fillStyle: '#888888' }
      };

      switch (shapeType) {
        case 0: // 長方形
          return Bodies.rectangle(x, y, size, 20, baseOptions);
        case 1: // 三角形
          return Bodies.polygon(x, y, 3, size * 0.4, baseOptions);
        case 2: // 星型（5つの尖り）
          {
            const starVertices = [];
            const outerRadius = size * 0.4;
            const innerRadius = size * 0.18;
            const points = 5;
            for (let i = 0; i < points * 2; i++) {
              const radius = i % 2 === 0 ? outerRadius : innerRadius;
              const angleOffset = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
              starVertices.push({
                x: Math.cos(angleOffset) * radius,
                y: Math.sin(angleOffset) * radius
              });
            }
            return Bodies.fromVertices(x, y, [starVertices], baseOptions);
          }
        default:
          return Bodies.rectangle(x, y, size, 20, baseOptions);
      }
    };

    // 選択されたパターンに基づいて配置
    switch (selectedPattern) {
      case 'spiral': // 黄金螺旋
        {
          const goldenAngle = Math.PI * (3 - Math.sqrt(5));
          for (let i = 0; i < numPlatforms; i++) {
            const angle = goldenAngle * i + Math.random() * 0.3;
            const radius = Math.sqrt(i + 1) * Math.min(width, height) * (0.1 + Math.random() * 0.04);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius * 0.8;
            const shapeAngle = angle + Math.PI / 4 + Math.random() * 0.5;
            platforms.push(createRandomShape(x, y, shapeAngle));
          }
        }
        break;

      case 'radial': // 放射状
        {
          const layers = 3;
          const perLayer = Math.floor(numPlatforms / layers);
          for (let layer = 0; layer < layers; layer++) {
            const radius = (layer + 1) * Math.min(width, height) * 0.15;
            const angleStep = (Math.PI * 2) / perLayer;
            for (let i = 0; i < perLayer; i++) {
              const angle = angleStep * i + Math.random() * 0.4;
              const x = centerX + Math.cos(angle) * radius * (0.9 + Math.random() * 0.2);
              const y = centerY + Math.sin(angle) * radius * 0.7 * (0.9 + Math.random() * 0.2);
              platforms.push(createRandomShape(x, y, angle + Math.random() * Math.PI));
            }
          }
        }
        break;

      case 'grid': // グリッド（ランダムオフセット付き）
        {
          const cols = 4;
          const spacingX = width * 0.22;
          const spacingY = height * 0.2;
          const startX = width * 0.2;
          const startY = height * 0.15;

          for (let i = 0; i < numPlatforms; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * spacingX + (Math.random() - 0.5) * spacingX * 0.3;
            const y = startY + row * spacingY + (Math.random() - 0.5) * spacingY * 0.3;
            const angle = (Math.random() - 0.5) * Math.PI / 3;
            platforms.push(createRandomShape(x, y, angle));
          }
        }
        break;

      case 'symmetric': // 対称配置
        {
          const half = Math.floor(numPlatforms / 2);
          for (let i = 0; i < half; i++) {
            const angle = (Math.PI * 2 * i) / half + Math.random() * 0.2;
            const radius = Math.min(width, height) * (0.2 + Math.random() * 0.15);
            const y = centerY + (Math.random() - 0.5) * height * 0.6;

            // 左側
            const xLeft = centerX - Math.abs(Math.cos(angle)) * radius;
            platforms.push(createRandomShape(xLeft, y, angle));

            // 右側（鏡像）
            const xRight = centerX + Math.abs(Math.cos(angle)) * radius;
            platforms.push(createRandomShape(xRight, y, -angle));
          }
        }
        break;
    }

    // 動く障害物（幾何学的な配置と動き）
    const movingObstacles = [
      {
        body: Bodies.rectangle(centerX, height * 0.25, width * 0.2, 20, {
          isStatic: true,
          friction: 0.001,
          restitution: 0.8,
          render: { fillStyle: '#AAAAAA' }
        }),
        pattern: 'circle', // 円運動
        baseX: centerX,
        baseY: height * 0.25,
        radiusX: width * 0.2,
        radiusY: width * 0.2,
        speed: 1.5,
      },
      {
        body: Bodies.rectangle(centerX, height * 0.45, width * 0.18, 20, {
          isStatic: true,
          friction: 0.001,
          restitution: 0.8,
          render: { fillStyle: '#AAAAAA' }
        }),
        pattern: 'ellipse', // 楕円運動
        baseX: centerX,
        baseY: height * 0.45,
        radiusX: width * 0.25,
        radiusY: width * 0.12,
        speed: 1.2,
      },
      {
        body: Bodies.rectangle(centerX, height * 0.65, width * 0.16, 20, {
          isStatic: true,
          friction: 0.001,
          restitution: 0.8,
          render: { fillStyle: '#AAAAAA' }
        }),
        pattern: 'lissajous', // リサージュ曲線
        baseX: centerX,
        baseY: height * 0.65,
        radiusX: width * 0.22,
        radiusY: width * 0.15,
        speed: 1.0,
        freqX: 3,
        freqY: 2,
      },
      {
        body: Bodies.rectangle(centerX, height * 0.85, width * 0.2, 20, {
          isStatic: true,
          friction: 0.001,
          restitution: 0.8,
          render: { fillStyle: '#AAAAAA' }
        }),
        pattern: 'figure8', // 8の字運動
        baseX: centerX,
        baseY: height * 0.85,
        radiusX: width * 0.18,
        radiusY: width * 0.1,
        speed: 1.3,
      },
    ];

    // 各プラットフォームにランダムな回転速度を追加
    const platformsWithRotation = platforms.map(platform => ({
      body: platform,
      rotationSpeed: (Math.random() - 0.5) * 0.02 // -0.01 ~ 0.01のランダム回転速度
    }));

    const movingBodies = movingObstacles.map(o => o.body);
    World.add(engine.world, [...walls, goalLine, ...platforms, ...movingBodies]);

    return { movingObstacles, width, height, goalLine, platforms: platformsWithRotation };
  };

  const createBalls = (engine: Matter.Engine, count: number, width: number, height: number) => {
    const { World, Bodies } = Matter;
    const balls: Ball[] = [];

    const ballRadius = Math.min(width, height) * 0.015; // 画面サイズに応じたボールサイズ

    // ランダムな初期位置を生成
    const startAreaWidth = width * 0.6;  // 画面幅の60%の範囲
    const startAreaHeight = height * 0.15; // 画面高さの15%の範囲
    const startX = width * 0.2; // 開始X位置（左から20%）
    const startY = height * 0.05; // 開始Y位置（上から5%）

    for (let i = 0; i < count; i++) {
      // ランダムな位置を生成（重なりを避けるため複数回試行）
      const x = startX + Math.random() * startAreaWidth;
      const y = startY + Math.random() * startAreaHeight;

      const color = COLORS[i % COLORS.length];

      const body = Bodies.circle(x, y, ballRadius, {
        restitution: 0.98,       // 弾性をかなり高く（ほとんどエネルギーを失わない）
        friction: 0.001,         // 摩擦を極限まで低く（滑りやすい）
        frictionStatic: 0,       // 静止摩擦をゼロに（止まりにくい）
        frictionAir: 0.0005,     // 空気抵抗をさらに低く
        density: 0.001,
        render: {
          fillStyle: color       // ビビッドカラーを設定
        }
      });

      balls.push({
        id: i,
        body,
        color: color,
      });

      World.add(engine.world, body);
    }

    return balls;
  };

  const startRace = () => {
    if (!engineRef.current || !renderRef.current) return;

    const width = renderRef.current.options.width || 800;
    const height = renderRef.current.options.height || 1000;

    // エンジンとレンダラーをリセット
    Matter.World.clear(engineRef.current.world, false);
    Matter.Engine.clear(engineRef.current);

    // コースと障害物を作成
    const { movingObstacles, goalLine, platforms } = createCourse(engineRef.current, width, height);

    // ボールを作成
    const balls = createBalls(engineRef.current, 20, width, height);
    ballsRef.current = balls;
    setRanking([]);

    // 動く障害物のアニメーション
    let time = 0;

    Matter.Events.on(engineRef.current, 'beforeUpdate', () => {
      time += 0.01;

      // 固定プラットフォームの回転
      platforms.forEach((platform) => {
        const currentAngle = platform.body.angle;
        Matter.Body.setAngle(platform.body, currentAngle + platform.rotationSpeed);
      });

      // 動く障害物のアニメーション
      movingObstacles.forEach((obstacle) => {
        const { body, pattern, baseX, baseY, radiusX, radiusY, speed, freqX, freqY } = obstacle;
        const t = time * (speed || 1);

        switch (pattern) {
          case 'circle': // 円運動
            Matter.Body.setPosition(body, {
              x: baseX + Math.cos(t) * radiusX,
              y: baseY + Math.sin(t) * radiusY
            });
            Matter.Body.setAngle(body, t); // 回転も追加
            break;

          case 'ellipse': // 楕円運動
            Matter.Body.setPosition(body, {
              x: baseX + Math.cos(t) * radiusX,
              y: baseY + Math.sin(t) * radiusY
            });
            Matter.Body.setAngle(body, t * 0.5); // ゆっくり回転
            break;

          case 'lissajous': // リサージュ曲線
            Matter.Body.setPosition(body, {
              x: baseX + Math.sin((freqX || 3) * t) * radiusX,
              y: baseY + Math.sin((freqY || 2) * t) * radiusY
            });
            Matter.Body.setAngle(body, Math.sin(t) * Math.PI / 4);
            break;

          case 'figure8': // 8の字運動
            {
              const s = Math.sin(t);
              Matter.Body.setPosition(body, {
                x: baseX + s * radiusX,
                y: baseY + Math.sin(2 * t) * radiusY
              });
              Matter.Body.setAngle(body, t);
            }
            break;
        }
      });
    });

    // ゴール検知
    Matter.Events.on(engineRef.current, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const goalBody = bodyA.label === 'goal' ? bodyA : bodyB.label === 'goal' ? bodyB : null;
        const ballBody = bodyA.label === 'goal' ? bodyB : bodyA;

        if (goalBody && engineRef.current) {
          const ball = ballsRef.current.find(b => b.body === ballBody);
          if (ball && !ball.finishTime) {
            ball.finishTime = Date.now();
            const newRanking = [...ballsRef.current.filter(b => b.finishTime), ball].sort((a, b) =>
              (a.finishTime || 0) - (b.finishTime || 0)
            );
            setRanking(newRanking);

            // ボールを削除
            Matter.World.remove(engineRef.current.world, ballBody);

            // 19個がゴールしたらゴールラインを削除（最後の1個は残る）
            if (newRanking.length === 19) {
              Matter.World.remove(engineRef.current.world, goalLine);
            }
          }
        }
      });
    });
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // 画面サイズを取得（ランキング表示の幅を考慮）
    const rankingWidth = 250;
    const padding = 40;
    const canvasWidth = window.innerWidth - rankingWidth - padding;
    const canvasHeight = window.innerHeight - padding;

    // Matter.jsのエンジンとレンダラーを作成
    const { Engine, Render, Runner } = Matter;

    const engine = Engine.create({
      gravity: { x: 0, y: 0.8 },  // 重力加速度を上げる
      enableSleeping: false  // ボディがスリープ状態にならないようにする
    });

    const render = Render.create({
      element: canvasRef.current,
      engine: engine,
      options: {
        width: canvasWidth,
        height: canvasHeight,
        wireframes: false,
        background: 'transparent',
      }
    });

    engineRef.current = engine;
    renderRef.current = render;

    // Canvas背景色を設定
    render.canvas.style.backgroundColor = '#1a1a2e';

    // 初期背景を描画
    const context = render.context;
    context.fillStyle = '#1a1a2e';
    context.fillRect(0, 0, render.canvas.width, render.canvas.height);

    // 残像効果を追加
    Matter.Events.on(render, 'afterRender', () => {
      // 毎フレーム、現在の描画の上に半透明の黒を重ねる
      context.fillStyle = 'rgba(26, 26, 46, 0.12)';
      context.fillRect(0, 0, render.canvas.width, render.canvas.height);
    });

    // レンダラーとランナーを起動
    Render.run(render);
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // レースを自動開始
    startRace();

    // クリーンアップ
    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      width: '100vw',
      height: '100vh',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div ref={canvasRef} />

      <div style={{ minWidth: '200px', maxWidth: '250px' }}>
        <h2 style={{ color: 'white', marginTop: 0, fontSize: '1.5rem' }}>Ranking</h2>
        <div>
          {ranking.map((ball, index) => (
            <div
              key={ball.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                marginBottom: '5px',
                backgroundColor: '#2a2a3e',
                borderRadius: '5px',
                color: 'white'
              }}
            >
              <span style={{ fontWeight: 'bold', minWidth: '30px' }}>
                #{index + 1}
              </span>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: ball.color
                }}
              />
              <span>Ball {ball.id + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarbleRace;
