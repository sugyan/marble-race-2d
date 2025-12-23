import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
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

  const createCourse = (engine: Matter.Engine) => {
    const { World, Bodies } = Matter;

    const width = 800;
    const height = 1000;

    // 壁（摩擦を低く設定）
    const walls = [
      // 左壁
      Bodies.rectangle(-10, height / 2, 20, height, {
        isStatic: true,
        friction: 0.001,
        restitution: 0.8
      }),
      // 右壁
      Bodies.rectangle(width + 10, height / 2, 20, height, {
        isStatic: true,
        friction: 0.001,
        restitution: 0.8
      }),
    ];

    // ゴールライン（緑色の線）
    const goalLine = Bodies.rectangle(width / 2, height - 30, width, 10, {
      isStatic: true,
      isSensor: true,  // 衝突判定はあるが物理的な衝突はしない
      label: 'goal',
      render: {
        fillStyle: '#00FF00'  // 緑色
      }
    });

    // プラットフォーム（階段状の障害物、摩擦を低く）
    const platforms = [
      Bodies.rectangle(200, 200, 200, 20, {
        isStatic: true,
        angle: 0.1,
        friction: 0.001,
        restitution: 0.8
      }),
      Bodies.rectangle(600, 350, 200, 20, {
        isStatic: true,
        angle: -0.1,
        friction: 0.001,
        restitution: 0.8
      }),
      Bodies.rectangle(300, 500, 200, 20, {
        isStatic: true,
        angle: 0.15,
        friction: 0.001,
        restitution: 0.8
      }),
      Bodies.rectangle(550, 650, 200, 20, {
        isStatic: true,
        angle: -0.15,
        friction: 0.001,
        restitution: 0.8
      }),
      Bodies.rectangle(350, 800, 250, 20, {
        isStatic: true,
        angle: 0.1,
        friction: 0.001,
        restitution: 0.8
      }),
    ];

    // 動く障害物
    const movingPlatform = Bodies.rectangle(400, 400, 150, 20, {
      isStatic: true,
      label: 'moving',
      friction: 0.001,
      restitution: 0.8
    });

    World.add(engine.world, [...walls, goalLine, ...platforms, movingPlatform]);

    return { movingPlatform };
  };

  const createBalls = (engine: Matter.Engine, count: number) => {
    const { World, Bodies } = Matter;
    const balls: Ball[] = [];

    const startY = 50;
    const spacing = 40;
    const ballsPerRow = 5;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / ballsPerRow);
      const col = i % ballsPerRow;
      const x = 200 + col * spacing + (row % 2) * 20; // スタッガード配置
      const y = startY + row * spacing;

      const body = Bodies.circle(x, y, 15, {
        restitution: 0.9,        // 弾性を高く（よく弾む）
        friction: 0.001,         // 摩擦を極限まで低く（滑りやすい）
        frictionStatic: 0,       // 静止摩擦をゼロに（止まりにくい）
        frictionAir: 0.0005,     // 空気抵抗をさらに低く
        density: 0.001,
      });

      balls.push({
        id: i,
        body,
        color: COLORS[i % COLORS.length],
      });

      World.add(engine.world, body);
    }

    return balls;
  };

  const startRace = () => {
    if (!engineRef.current) return;

    // エンジンとレンダラーをリセット
    Matter.World.clear(engineRef.current.world, false);
    Matter.Engine.clear(engineRef.current);

    // コースと障害物を作成
    const { movingPlatform } = createCourse(engineRef.current);

    // ボールを作成
    const balls = createBalls(engineRef.current, 10);
    ballsRef.current = balls;
    setRanking([]);

    // 動く障害物のアニメーション
    let time = 0;
    Matter.Events.on(engineRef.current, 'beforeUpdate', () => {
      time += 0.02;
      Matter.Body.setPosition(movingPlatform, {
        x: 400 + Math.sin(time * 2) * 150,
        y: 400
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
            setRanking(prev => [...prev, ball].sort((a, b) =>
              (a.finishTime || 0) - (b.finishTime || 0)
            ));

            // ボールを削除
            Matter.World.remove(engineRef.current.world, ballBody);
          }
        }
      });
    });
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Matter.jsのエンジンとレンダラーを作成
    const { Engine, Render, Runner } = Matter;

    const engine = Engine.create({
      gravity: { x: 0, y: 1 },
      enableSleeping: false  // ボディがスリープ状態にならないようにする
    });

    const render = Render.create({
      element: canvasRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 1000,
        wireframes: false,
        background: '#1a1a2e',
      }
    });

    engineRef.current = engine;
    renderRef.current = render;

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
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      <div ref={canvasRef} />

      <div style={{ minWidth: '200px' }}>
        <h2 style={{ color: 'white', marginTop: 0 }}>Ranking</h2>
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
