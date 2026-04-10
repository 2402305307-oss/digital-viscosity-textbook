import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  FlaskConical,
  Calculator,
  Video,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatNum(n, digits = 4) {
  if (!Number.isFinite(n)) return "—";
  return Number(n).toFixed(digits);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function DigitalViscosityTextbook() {

  const [activeTab, setActiveTab] = useState("sim");

  // ---------- 仿真参数 ----------
  const [ballRadiusMm, setBallRadiusMm] = useState(1.5); // mm
  const [ballDensity, setBallDensity] = useState(7800); // kg/m3
  const [fluidDensity, setFluidDensity] = useState(1260); // kg/m3
  const [viscosity, setViscosity] = useState(1.2); // Pa·s
  const [dropDistanceCm, setDropDistanceCm] = useState(18); // cm
  const [gravity, setGravity] = useState(9.8);
  const [tubeDiameterCm, setTubeDiameterCm] = useState(5.0); // D，量筒内径 cm
const [liquidHeightCm, setLiquidHeightCm] = useState(20.0); // H，液柱有效高度 cm

  const radius = ballRadiusMm / 1000;
const distance = dropDistanceCm / 100;
const tubeDiameter = tubeDiameterCm / 100;
const liquidHeight = liquidHeightCm / 100;

  const correctionFactor = useMemo(() => {
  if (tubeDiameter <= 0 || liquidHeight <= 0) return 1;
  return (1 + 4.8 * radius / tubeDiameter) * (1 + 3.3 * radius / liquidHeight);
}, [radius, tubeDiameter, liquidHeight]);

const terminalVelocityRaw = useMemo(() => {
  const deltaRho = Math.max(ballDensity - fluidDensity, 0);
  return (2 * radius * radius * deltaRho * gravity) / (9 * Math.max(viscosity, 0.001));
}, [ballDensity, fluidDensity, gravity, radius, viscosity]);

const terminalVelocity = useMemo(() => {
  return terminalVelocityRaw / correctionFactor;
}, [terminalVelocityRaw, correctionFactor]);

  const accelDistanceRatio = 0.28; // 前 28% 作为加速区
const measureZoneRatio = 0.45;   // 中间 45% 作为计时区

const accelDistance = useMemo(() => distance * accelDistanceRatio, [distance]);
const measureDistance = useMemo(() => distance * measureZoneRatio, [distance]);

const predictedTime = useMemo(() => {
  if (terminalVelocity <= 0) return 0;
  return distance / terminalVelocity;
}, [distance, terminalVelocity]);

const predictedMeasureTime = useMemo(() => {
  if (terminalVelocity <= 0) return 0;
  return measureDistance / terminalVelocity;
}, [measureDistance, terminalVelocity]);

const startMeasurePercent = accelDistanceRatio * 100;
const endMeasurePercent = (accelDistanceRatio + measureZoneRatio) * 100;
// 仿真图统一坐标参数
const tubeTopPx = 12;
const liquidHeightPx = 300;
const ballStartPx = 3;
const ballSizePx = 20; // 小球直径，对应 h-5 w-5
const ballRadiusPx = ballSizePx / 2;
const ballTravelPx = liquidHeightPx - ballSizePx;

// A、B 线的位置（按球心经过时计时）
const aLinePx = ballStartPx + (startMeasurePercent / 100) * ballTravelPx + ballRadiusPx;
const bLinePx = ballStartPx + (endMeasurePercent / 100) * ballTravelPx + ballRadiusPx;

  const reynoldsNumber = useMemo(() => {
    // Re = 2ρvr/η
    return (2 * fluidDensity * terminalVelocity * radius) / Math.max(viscosity, 0.001);
  }, [fluidDensity, terminalVelocity, radius, viscosity]);

  const stokesValid = reynoldsNumber < 1;

  // ---------- 仿真动画 ----------
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simTime, setSimTime] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const durationMs = Math.max(predictedTime * 1000, 1200);

  useEffect(() => {
  if (!isRunning) return;

  const tick = (timestamp) => {
    if (!startRef.current) startRef.current = timestamp;

    const elapsed = timestamp - startRef.current;
    const p = clamp(elapsed / durationMs, 0, 1);
    const percent = p * 100;

    setProgress(percent);

    // 小球当前顶部位置
    const ballTopPx = ballStartPx + p * ballTravelPx;
    // 小球球心位置
    const ballCenterPx = ballTopPx + ballRadiusPx;

    // 用球心和 A/B 线的像素位置直接比较
    if (ballCenterPx < aLinePx) {
      setSimTime(0);
    } else if (ballCenterPx >= aLinePx && ballCenterPx <= bLinePx) {
      const zoneProgress = (ballCenterPx - aLinePx) / (bLinePx - aLinePx);
      setSimTime(clamp(zoneProgress, 0, 1) * predictedMeasureTime);
    } else {
      setSimTime(predictedMeasureTime);
    }

    if (p < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setIsRunning(false);
    }
  };

  rafRef.current = requestAnimationFrame(tick);
  return () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };
}, [
  isRunning,
  durationMs,
  predictedMeasureTime,
  ballStartPx,
  ballTravelPx,
  ballRadiusPx,
  aLinePx,
  bLinePx,
]);

  const resetSim = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setIsRunning(false);
    setProgress(0);
    setSimTime(0);
  };

  const startSim = () => {
    resetSim();
    setIsRunning(true);
  };

  // ---------- 数据处理 ----------
  const [measureDistanceCm, setMeasureDistanceCm] = useState(63); // 下落高度 y，单位 cm
const [measureDiameterMm, setMeasureDiameterMm] = useState(1.160); // 小球直径 d，单位 mm
const [measureBallDensity, setMeasureBallDensity] = useState(7860); // kg/m3
const [measureFluidDensity, setMeasureFluidDensity] = useState(952); // kg/m3
const [timesText, setTimesText] = useState("26.57,26.35,26.60,25.66,26.60,26.69");
const [measureTubeDiameterMm, setMeasureTubeDiameterMm] = useState(61.5); // 圆筒内径 D，单位 mm
const [measureLiquidHeightCm, setMeasureLiquidHeightCm] = useState(120.0); // 液柱高度 H，单位 cm
  const times = useMemo(() => {
    return timesText
      .split(/[,，\s]+/)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);
  }, [timesText]);

  const meanTime = useMemo(() => {
  if (!times.length) return 0;
  return times.reduce((a, b) => a + b, 0) / times.length;
}, [times]);

const measureVelocity = useMemo(() => {
  if (!meanTime) return 0;
  return (measureDistanceCm / 100) / meanTime;
}, [meanTime, measureDistanceCm]);

// 每一次测量对应的粘滞系数 η_i
const etaValues = useMemo(() => {
  const d = measureDiameterMm / 1000; // mm -> m
  const D = measureTubeDiameterMm / 1000; // mm -> m
  const H = measureLiquidHeightCm / 100; // cm -> m
  const y = measureDistanceCm / 100; // cm -> m
  const rhoDiff = measureBallDensity - measureFluidDensity;

  if (d <= 0 || D <= 0 || H <= 0 || y <= 0 || rhoDiff <= 0) return [];

  return times.map((t) => {
    if (t <= 0) return 0;

    return (
      (gravity * d * d * t * rhoDiff) /
      (18 * y * (1 + 2.4 * d / D) * (1 + 1.6 * d / H))
    );
  });
}, [
  times,
  measureDiameterMm,
  measureTubeDiameterMm,
  measureLiquidHeightCm,
  measureDistanceCm,
  measureBallDensity,
  measureFluidDensity,
  gravity,
]);

// 粘滞系数平均值 η̄
const meanEta = useMemo(() => {
  if (!etaValues.length) return 0;
  return etaValues.reduce((sum, val) => sum + val, 0) / etaValues.length;
}, [etaValues]);

// 平均值不确定度 σ_{η̄}
const etaUncertainty = useMemo(() => {
  const n = etaValues.length;
  if (n <= 1) return 0;

  const sumSq = etaValues.reduce((sum, val) => {
    return sum + (val - meanEta) ** 2;
  }, 0);

  return Math.sqrt(sumSq / (n * (n - 1)));
}, [etaValues, meanEta]);

  

  const quizItems = [
  {
    q: "为什么要等小球达到匀速后再计时？",
    a: "因为落球法所用公式建立在小球做终端速度运动的条件上。只有当重力、浮力和粘滞阻力达到平衡后，小球才做匀速直线运动，此时测得的速度才能用于计算液体粘滞系数。",
  },
  {
    q: "还有哪些方法可以测量液体粘滞系数？",
    a: "常见方法包括毛细管法、旋转粘度计法和振动法等。不同方法适用于不同类型液体，在精度和实验条件上也有所差异。",
  },
  {
    q: "为了改善小球下落时间，实验中可以怎么调整？",
    a: "可以选择不同半径的小球、调整液体密度或粘滞系数、改变计时区长度等，使下落时间处于更容易测量的范围。",
  },
  {
    q: "如何改进测量时间与读数精度？",
    a: "可以使用光电计时、视频分析等方式替代人工计时，同时增加测量次数取平均值，并控制实验条件稳定。",
  },
  {
    q: "怎么判断小球已经做匀速下落？",
    a: "可以观察小球通过相同距离所用时间是否相等，或者设置加速区，让小球进入计时区时已接近匀速。",
  },
  {
    q: "什么时候斯托克斯公式可能不再适用？",
    a: "当雷诺数较大、流动不再是层流、容器壁效应明显或小球运动速度较大时，斯托克斯公式不再适用。",
  },

  // 👇 原“思考与提升”融合进来
  {
    q: "比较落球法与其他粘滞系数测量方法的优缺点。",
    a: "落球法装置简单、操作方便，但精度受壁面效应和计时误差影响较大；而旋转粘度计等方法精度更高，但仪器复杂、成本较高。",
  },
  {
    q: "量筒内径 D 和液柱高度 H 会对实验结果产生什么影响？",
    a: "较小的内径或较低的液柱高度会增强壁面效应，使测得的粘滞系数偏大，因此需要进行边界修正。",
  },
  {
    q: "实验中可能存在哪些系统误差和随机误差？",
    a: "系统误差包括仪器刻度误差、温度变化、壁面效应等；随机误差主要来自计时误差和读数误差。",
  },
  {
    q: "如果让你改进这个实验，你会从哪些方面入手？",
    a: "可以改进计时方式（如光电计时）、优化小球尺寸选择、增加计时距离、控制温度稳定等，以提高测量精度。",
  },
];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-100 via-white to-indigo-100">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-sky-300 blur-3xl" />
          <div className="absolute top-24 right-0 h-72 w-72 rounded-full bg-indigo-300 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
  className="grid items-center gap-10 lg:grid-cols-[1fr_0.95fr]"
>
  {/* 左侧标题 */}
  <div className="flex min-h-[520px] items-center">
    <div>
      <h1 className="text-6xl font-extrabold leading-[1.1] tracking-wide lg:text-8xl">
        <span className="block text-slate-900">落球法测</span>
        <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
          粘滞系数实验
        </span>
      </h1>
    </div>
  </div>

  {/* 右侧学习目标 */}
  <Card className="rounded-[32px] border-0 bg-white/90 shadow-2xl backdrop-blur">
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-3 text-3xl font-bold">
        <Sparkles className="h-7 w-7" /> 学习目标
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-5 text-base leading-8 text-slate-700">
      <div className="rounded-2xl bg-slate-50 p-5">
        1. 理解落球法测量液体粘滞系数的基本思想。
      </div>
      <div className="rounded-2xl bg-slate-50 p-5">
        2. 掌握小球在液体中受力分析及斯托克斯公式的推导过程。
      </div>
      <div className="rounded-2xl bg-slate-50 p-5">
        3. 能利用实验数据计算粘滞系数，并进行误差分析。
      </div>
      <div className="rounded-2xl bg-slate-50 p-5">
        4. 理解边界修正的意义，认识实验条件对结果的影响。
      </div>
    </CardContent>
  </Card>
</motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 md:grid-cols-5">
  <TabsTrigger value="theory" className="rounded-xl">实验原理</TabsTrigger>
  <TabsTrigger value="sim" className="rounded-xl">仿真实验</TabsTrigger>
  <TabsTrigger value="video" className="rounded-xl">实验视频</TabsTrigger>
  <TabsTrigger value="data" className="rounded-xl">数据处理</TabsTrigger>
  <TabsTrigger value="quiz" className="rounded-xl">思考提升</TabsTrigger>
</TabsList>
          <TabsContent value="theory" className="space-y-6">
  <Card className="rounded-3xl shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-2xl">
        <BookOpen className="h-6 w-6" /> 实验原理
      </CardTitle>
    </CardHeader>

    <CardContent className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[24px] border bg-slate-50 p-5">
        <div className="mb-3 text-lg font-semibold">受力分析图</div>

        <div className="flex justify-center">
          <svg
            viewBox="0 0 320 300"
            className="w-full max-w-[360px] rounded-2xl border bg-white"
          >
            <rect x="1" y="1" width="318" height="298" rx="22" fill="#f8fafc" stroke="#e2e8f0" />

            {/* 圆筒外壁 */}
            <rect x="110" y="40" width="100" height="190" rx="35" fill="#dbeafe" stroke="#94a3b8" strokeWidth="3" />
            {/* 液体内区 */}
            <rect x="122" y="52" width="76" height="166" rx="28" fill="#bfdbfe" opacity="0.8" />

            {/* 小球 */}
            <circle cx="160" cy="145" r="18" fill="#334155" />

            {/* 三个力都通过重心，且浮力阻力都竖直向上 */}
            {/* 重力 */}
            <line x1="160" y1="145" x2="160" y2="210" stroke="#ef4444" strokeWidth="4" />
            <polygon points="160,220 152,206 168,206" fill="#ef4444" />
            <text x="166" y="214" fontSize="16" fill="#ef4444" fontWeight="700">G</text>

            {/* 浮力 */}
            <line x1="148" y1="145" x2="148" y2="92" stroke="#2563eb" strokeWidth="4" />
            <polygon points="148,84 140,98 156,98" fill="#2563eb" />
            <text x="118" y="80" fontSize="16" fill="#2563eb" fontWeight="700">F浮</text>

            {/* 阻力 */}
            <line x1="172" y1="145" x2="172" y2="92" stroke="#059669" strokeWidth="4" />
            <polygon points="172,84 164,98 180,98" fill="#059669" />
            <text x="176" y="80" fontSize="16" fill="#059669" fontWeight="700">F阻</text>

            {/* 速度 v */}
            <line x1="245" y1="95" x2="245" y2="155" stroke="#0f172a" strokeWidth="3" strokeDasharray="6 5" />
            <polygon points="245,165 237,151 253,151" fill="#0f172a" />
            <text x="258" y="132" fontSize="18" fill="#0f172a" fontWeight="700">v</text>

            {/* D：量筒直径 */}
            <line x1="110" y1="28" x2="210" y2="28" stroke="#7c3aed" strokeWidth="2.5" />
            <line x1="110" y1="22" x2="110" y2="34" stroke="#7c3aed" strokeWidth="2.5" />
            <line x1="210" y1="22" x2="210" y2="34" stroke="#7c3aed" strokeWidth="2.5" />
            <text x="155" y="20" fontSize="16" fill="#7c3aed" fontWeight="700">D</text>

            {/* H：液柱高度 */}
            <line x1="85" y1="52" x2="85" y2="218" stroke="#ea580c" strokeWidth="2.5" />
            <line x1="78" y1="52" x2="92" y2="52" stroke="#ea580c" strokeWidth="2.5" />
            <line x1="78" y1="218" x2="92" y2="218" stroke="#ea580c" strokeWidth="2.5" />
            <text x="72" y="140" fontSize="16" fill="#ea580c" fontWeight="700">H</text>
          </svg>
        </div>

        
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
  <div className="mb-3 text-base font-semibold text-slate-800">公式中各物理量的意义</div>

  <div className="grid gap-3 text-sm leading-7 text-slate-700">
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <b>m</b>：小球质量；<b>g</b>：重力加速度；<b>a</b>：小球下落加速度。
    </div>

    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <b>f</b>：液体对小球的浮力；<b>F</b>：液体对小球的粘滞阻力。
    </div>

    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <b>η</b>：液体的粘滞系数；<b>r</b>：小球半径；<b>v</b>：小球匀速下落时的速度。
    </div>

    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <b>ρ</b>：小球密度；<b>ρ₀</b>：液体密度。
    </div>

    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <b>d</b>：小球直径；<b>t</b>：小球通过测量区所用时间；<b>l</b>：测量区长度。
    </div>

    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <b>D</b>：量筒内径；<b>H</b>：液柱有效高度。二者用于边界修正，反映容器壁和液柱高度对实验结果的影响。
    </div>
  </div>
</div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          小球在液体中下落时，受力关系为：
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-800">
            mg − f − F = ma
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          根据斯托克斯定律，粘滞阻力为：
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-800">
            F = 6πηrv
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          当小球达到匀速下落时，a = 0，因此：
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-800">
            mg − f − F = 0
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          代入重力与浮力表达式，可得基本公式：
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-800">
            η = 2(ρ − ρ₀)gr² / 9v
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4">
          考虑量筒内径 D 与液柱高度 H 的修正后：
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-800">
            η = [2(ρ − ρ₀)gr² / 9v] · 1 / [(1 + 4.8r/D)(1 + 3.3r/H)]
          </div>
        </div>

        <div className="rounded-2xl bg-indigo-50 p-4">
          若实验中测得小球直径 d、光标间距 l、通过时间 t，则常用表达式为：
          <div className="mt-2 rounded-xl bg-white px-4 py-3 text-center font-semibold text-slate-800">
            η = gd²t(ρ − ρ₀) / [18l(1 + 2.4d/D)(1 + 1.6d/H)]
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>

         <TabsContent value="sim" className="space-y-6">
  <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
    <Card className="rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <FlaskConical className="h-6 w-6" /> 参数设置区
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {[
          ["小球半径 r（mm）", ballRadiusMm, setBallRadiusMm, 0.5, 5, 0.1],
          ["小球密度 ρ球（kg/m³）", ballDensity, setBallDensity, 2000, 9000, 100],
          ["液体密度 ρ液（kg/m³）", fluidDensity, setFluidDensity, 500, 2000, 10],
          ["粘滞系数 η（Pa·s）", viscosity, setViscosity, 0.1, 5, 0.1],
          ["量筒内径 D（cm）", tubeDiameterCm, setTubeDiameterCm, 2, 10, 0.1],
          ["液柱有效高度 H（cm）", liquidHeightCm, setLiquidHeightCm, 5, 40, 0.5],
          ["计时距离 L（cm）", dropDistanceCm, setDropDistanceCm, 5, 40, 1],
          ["重力加速度 g（m/s²）", gravity, setGravity, 9.7, 9.9, 0.01],
        ].map(([label, value, setter, min, max, step]) => (
          <div key={label} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium">{label}</Label>
              <Input
                className="w-28 rounded-xl"
                type="number"
                step={step}
                min={min}
                max={max}
                value={value}
                onChange={(e) => setter(Number(e.target.value))}
              />
            </div>
            <Slider
              value={[Number(value)]}
              min={min}
              max={max}
              step={step}
              onValueChange={(v) => setter(v[0])}
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button className="rounded-2xl" onClick={startSim}>
            <Play className="mr-2 h-4 w-4" /> 开始仿真
          </Button>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => (isRunning ? setIsRunning(false) : setIsRunning(true))}
          >
            {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isRunning ? "暂停" : "继续"}
          </Button>
          <Button
            variant="secondary"
            className="col-span-2 rounded-2xl"
            onClick={resetSim}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> 重置仿真
          </Button>
        </div>
        <div className="rounded-[24px] bg-slate-50 p-5">
  <div className="mb-3 text-lg font-semibold">主要物理量解释</div>

  <div className="grid gap-3 text-sm leading-7 text-slate-700">
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <b>修正后终端速度</b>：指小球在液体中达到受力平衡后稳定下落的速度，
      并已考虑量筒内径和液柱高度带来的边界修正影响。
    </div>

    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <b>计时区理论时间</b>：指小球以修正后终端速度通过 A 线到 B 线之间计时区
      所需要的理论时间，可用于帮助理解实验中计时数据的大致范围。
    </div>

    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <b>边界修正系数</b>：用于修正量筒壁面和液柱高度对小球下落速度的影响。
      该值越偏离 1，说明边界效应越明显，实验结果越需要修正。
    </div>

    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <b>雷诺数 Re</b>：用于判断液体流动状态的无量纲物理量。
      当雷诺数较小时，液体流动更接近层流状态，斯托克斯公式更适用。
    </div>

    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
      <b>公式适用性</b>：根据当前参数下的雷诺数和运动条件，
      对斯托克斯公式是否较适合用于本实验进行提示。
    </div>
  </div>
</div>
      </CardContent>
    </Card>

    <div className="space-y-6">
      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Gauge className="h-6 w-6" /> 仿真动画区
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[28px] border bg-gradient-to-b from-sky-50 to-slate-100 p-5">
            <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
              <span>落球进度</span>
              <span>{formatNum(progress, 1)}%</span>
            </div>
            <Progress value={progress} className="h-3 rounded-full" />

            <div className="relative mt-6 h-[420px] overflow-hidden rounded-[24px] border bg-white">
              {/* 量筒外壁 */}
              <div className="absolute left-1/2 top-4 h-[360px] w-24 -translate-x-1/2 rounded-b-[40px] rounded-t-[18px] border-4 border-slate-300 bg-gradient-to-b from-sky-100 to-sky-50 shadow-inner" />
              {/* 液体区域 */}
              <div className="absolute left-1/2 top-12 h-[300px] w-20 -translate-x-1/2 rounded-b-[34px] rounded-t-[14px] bg-gradient-to-b from-sky-200/70 to-sky-300/40" />

              {/* A、B 标线：按球心经过位置绘制 */}
              <div
  className="absolute left-1/2 w-28 -translate-x-1/2 border-t-2 border-dashed border-emerald-500"
  style={{ top: `${tubeTopPx + aLinePx}px` }}
/>
<div
  className="absolute left-1/2 w-28 -translate-x-1/2 border-t-2 border-dashed border-rose-500"
  style={{ top: `${tubeTopPx + bLinePx}px` }}
/>

              {/* 小球 */}
              <div className="absolute left-1/2 top-12 h-[300px] w-20 -translate-x-1/2">
                <motion.div
                  animate={{ y: `${(progress / 100) * ballTravelPx}px` }}
                  transition={{ ease: "linear", duration: 0.05 }}
                  className="absolute left-1/2 top-3 h-5 w-5 -translate-x-1/2 rounded-full bg-slate-700 shadow-lg"
                />
              </div>

              {/* 文字标注 */}
              <div className="absolute left-6 top-14 text-xs text-slate-500">起点</div>
              <div className="absolute left-6 top-[112px] text-xs text-slate-500">加速区</div>
              <div className="absolute left-6 top-[170px] text-xs font-medium text-emerald-600">
                A 线（开始计时）
              </div>
              <div className="absolute left-6 top-[255px] text-xs font-medium text-rose-600">
                B 线（停止计时）
              </div>
              <div className="absolute left-6 top-[320px] text-xs text-slate-500">终点</div>

              <div className="absolute right-4 top-[160px] rounded-xl bg-white/90 px-3 py-2 text-xs shadow">
                计时区
              </div>

              <div className="absolute bottom-4 left-4 rounded-2xl bg-white/90 px-4 py-2 text-sm shadow">
                当前计时：<span className="font-semibold">{formatNum(simTime, 2)} s</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">修正后终端速度</div>
            <div className="mt-2 text-3xl font-bold">{formatNum(terminalVelocity, 4)} m/s</div>
            <div className="mt-2 text-xs text-slate-500">
              未修正：{formatNum(terminalVelocityRaw, 4)} m/s
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">计时区理论时间</div>
            <div className="mt-2 text-3xl font-bold">{formatNum(predictedMeasureTime, 3)} s</div>
            <div className="mt-2 text-xs text-slate-500">
              全程理论时间：{formatNum(predictedTime, 3)} s
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">边界修正系数</div>
            <div className="mt-2 text-3xl font-bold">{formatNum(correctionFactor, 3)}</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">雷诺数 Re</div>
            <div className="mt-2 text-3xl font-bold">{formatNum(reynoldsNumber, 3)}</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm sm:col-span-2">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">公式适用性</div>
            <div className="mt-2 text-xl font-bold">
              {stokesValid ? (
                <span className="text-emerald-600">较适合使用斯托克斯公式</span>
              ) : (
                <span className="text-amber-600">需注意层流条件和修正项</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm sm:col-span-2">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">仿真动画说明</div>
            <div className="mt-2 text-base leading-7 text-slate-700">
              仿真动画中，小球先经过上部加速区；当其进入 A 线后开始计时，在 B 线停止计时。
              这样得到的是更接近终端速度条件下的测量结果，与真实落球法实验的处理方式一致。
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</TabsContent>

         <TabsContent value="video" className="space-y-6">
  <Card className="rounded-3xl shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-2xl">
        <Video className="h-6 w-6" /> 实际实验视频教学
      </CardTitle>
    </CardHeader>

    <CardContent>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          [
            "步骤1：实验器材介绍",
            "/step1.mp4",
            "介绍实验所需器材，包括装有蓖麻油的量筒、小铁球、读数显微镜、游标卡尺、米尺和秒表。"
          ],
          [
            "步骤2：液体与小球准备",
            "/step2.mp4",
            "展示小球直径测量以及量筒内径测量。"
          ],
          [
            "步骤3：释放小球与计时",
            "/step3.mp4",
            "展示小球释放、下落过程以及计时方法。"
          ],
          [
            "步骤4：数据处理",
            "/step6.mp4",
            "展示实验数据代入公式计算粘滞系数，并进行平均值与不确定度分析。"
          ],
        ].map(([title, src, desc], idx) => (
          <div key={title} className="rounded-[24px] border bg-slate-50 p-4 shadow-sm">
            <video
              src={src}
              controls
              className="aspect-video w-full rounded-2xl bg-black"
            />

            <div className="mt-4 text-lg font-semibold">{title}</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">{desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[28px] bg-indigo-50 p-6">
        <h3 className="text-lg font-semibold">视频学习提示</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            "先看器材介绍，明确需要使用的仪器",
            "观察小球释放与计时的规范操作",
            "重点关注数据代入公式的计算过程",
            "结合实验视频与网页中的公式一起学习",
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">
              <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>

          <TabsContent value="data" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Calculator className="h-6 w-6" /> 数据输入
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
  <Label>下落高度 y（cm）</Label>
  <Input
    value={measureDistanceCm}
    type="number"
    onChange={(e) => setMeasureDistanceCm(Number(e.target.value))}
    className="mt-2 rounded-xl"
  />
</div>

<div>
  <Label>小球直径 d（mm）</Label>
  <Input
    value={measureDiameterMm}
    type="number"
    onChange={(e) => setMeasureDiameterMm(Number(e.target.value))}
    className="mt-2 rounded-xl"
  />
</div>
                  <div>
                    <Label>小球密度 ρ球（kg/m³）</Label>
                    <Input value={measureBallDensity} type="number" onChange={(e) => setMeasureBallDensity(Number(e.target.value))} className="mt-2 rounded-xl" />
                  </div>
                  <div>
                    <Label>液体密度 ρ液（kg/m³）</Label>
                    <Input value={measureFluidDensity} type="number" onChange={(e) => setMeasureFluidDensity(Number(e.target.value))} className="mt-2 rounded-xl" />
                  </div>
                  <div>
  <Label>圆筒内径 D（mm）</Label>
  <Input
    value={measureTubeDiameterMm}
    type="number"
    onChange={(e) => setMeasureTubeDiameterMm(Number(e.target.value))}
    className="mt-2 rounded-xl"
  />
</div>

<div>
  <Label>液柱有效高度 H（cm）</Label>
  <Input
    value={measureLiquidHeightCm}
    type="number"
    onChange={(e) => setMeasureLiquidHeightCm(Number(e.target.value))}
    className="mt-2 rounded-xl"
  />
</div>
                  <div>
                    <Label>多次测量时间 t（s）</Label>
                    <Input value={timesText} onChange={(e) => setTimesText(e.target.value)} className="mt-2 rounded-xl" />
                    <div className="mt-2 text-xs text-slate-500">支持英文逗号、中文逗号或空格分隔，例如：2.31,2.28,2.35</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">自动计算结果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {[
    ["平均时间", `${formatNum(meanTime, 3)} s`],
    ["速度 v", `${formatNum(measureVelocity, 4)} m/s`],
    ["平均粘滞系数 η", `${formatNum(meanEta, 4)} Pa·s`],
    ["不确定度", `${formatNum(etaUncertainty, 4)} Pa·s`],
  ].map(([label, val]) => (
    <div key={label} className="rounded-2xl bg-slate-50 p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold">{val}</div>
    </div>
  ))}
</div>

                  <div className="rounded-[24px] border p-4">
  <div className="mb-3 text-lg font-semibold">实验记录表</div>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>次数</TableHead>
        <TableHead>时间 t / s</TableHead>
        <TableHead>ηi / Pa·s</TableHead>
        <TableHead>|ηi-η̄| / Pa·s</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {times.length ? (
        times.map((t, i) => (
          <TableRow key={i}>
            <TableCell>{i + 1}</TableCell>
            <TableCell>{formatNum(t, 3)}</TableCell>
            <TableCell>{formatNum(etaValues[i], 4)}</TableCell>
            <TableCell>{formatNum(Math.abs(etaValues[i] - meanEta), 4)}</TableCell>
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={4} className="text-center text-slate-500">
            请输入有效实验数据
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
</div>

                  <div className="grid gap-4 md:grid-cols-2">
  <div className="rounded-[24px] bg-emerald-50 p-5">
    <div className="font-semibold">结果解释</div>
    <div className="mt-2 text-sm leading-7 text-slate-700">
      本组数据计算得到的粘滞系数平均值约为 <b>{formatNum(meanEta, 4)} Pa·s</b>，
      平均值不确定度约为 <b>{formatNum(etaUncertainty, 4)} Pa·s</b>，
      说明实验结果具有
      {etaUncertainty < 0.005 ? "较好" : etaUncertainty < 0.015 ? "一定" : "较明显"}
      的稳定性。
    </div>
  </div>

  <div className="rounded-[24px] bg-amber-50 p-5">
    <div className="font-semibold">误差来源提示</div>
    <div className="mt-2 text-sm leading-7 text-slate-700">
      可能包括：人工计时误差、球直径测量误差、液温变化、壁面效应、未完全达到匀速、球体不够规则等。
    </div>
  </div>
</div>
                  
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          

          <TabsContent value="quiz" className="space-y-6">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">思考与提升</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {quizItems.map((item, idx) => (
                    <details key={idx} className="rounded-2xl border bg-slate-50 p-5">
                      <summary className="cursor-pointer list-none font-semibold">
                        {idx + 1}. {item.q}
                      </summary>
                      <div className="mt-3 leading-7 text-slate-700">{item.a}</div>
                    </details>
                  ))}
                </div>

                
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      
    </div>
  );
}
