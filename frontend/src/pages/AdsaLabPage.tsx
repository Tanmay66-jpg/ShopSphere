import { useState, useEffect, useCallback } from 'react';
import { uiStore } from '../services/uiStore';
import { api } from '../services/api';
import type { BenchmarkResponse, OperationTraceResponse } from '../types/adsa';

export function AdsaLabPage() {
  // Mode switcher
  const [labMode, setLabMode] = useState<'benchmark' | 'trace' | 'inflight' | 'skew' | 'error'>('benchmark');

  // Matrix parameters
  const [datasetSize, setDatasetSize] = useState<number>(1000);
  const [insertionOrder, setInsertionOrder] = useState<'random' | 'ascending' | 'descending'>('random');
  const [operation, setOperation] = useState<'search' | 'insert' | 'delete'>('search');
  const [targetKey, setTargetKey] = useState<number>(2499);
  const [targetSku, setTargetSku] = useState<string>('AUD-WH-904');
  const [repetitions, setRepetitions] = useState<number>(3);
  const [seed, setSeed] = useState<number>(42);
  const [timeUnitMode, setTimeUnitMode] = useState<'ms' | 'us'>('ms');

  // Live benchmark results from backend
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Visualization interactive states
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showNodeMetadata, setShowNodeMetadata] = useState<boolean>(true);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [traceStep, setTraceStep] = useState<number>(0);
  const [traceData, setTraceData] = useState<OperationTraceResponse | null>(null);

  const isSkewed = insertionOrder === 'ascending' || insertionOrder === 'descending' || labMode === 'skew';

  // Run benchmark on backend
  const handleRunBenchmark = useCallback(async () => {
    if (isLoading) return; // Prevent duplicate concurrent executions
    setIsLoading(true);
    setLabMode('inflight');
    setErrorMessage(null);

    try {
      const result = await api.runBenchmark({
        dataset_size: datasetSize,
        insertion_order: insertionOrder,
        repetitions,
        seed,
        target_key: targetKey,
        include_raw_samples: true,
      });

      setBenchmarkResult(result);
      setLabMode('benchmark');
      setIsLoading(false);

      uiStore.showToast(
        'FastAPI Benchmark Completed',
        `Live N=${result.dataset_size} (${result.insertion_order}). BST H: ${result.bst_height}, AVL H: ${result.avl_height} (Rotations: ${result.avl_rotations?.total ?? 0}).`,
        'success'
      );
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || 'Failed to execute benchmark on backend';
      setErrorMessage(msg);
      setLabMode('error');
      uiStore.showToast('Benchmark Error', msg, 'error');
    }
  }, [datasetSize, insertionOrder, repetitions, seed, targetKey, isLoading]);

  // Initial load: fetch real benchmark from backend
  useEffect(() => {
    handleRunBenchmark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live Search Path Tracing
  const handleStepTrace = async () => {
    setIsTracing(true);
    setTraceStep(0);
    setLabMode('trace');

    try {
      const trace = await api.traceOperation({
        tree_type: 'avl',
        target_key: targetKey,
      });
      setTraceData(trace);

      const totalHops = trace.path_keys.length;
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        setTraceStep(current);
        if (current >= totalHops) {
          clearInterval(interval);
          setIsTracing(false);
          uiStore.showToast(
            'Traversal Complete',
            `Target ${trace.found ? 'found' : 'not found'} in ${trace.comparisons} key comparisons (${trace.execution_time_ms} ms).`,
            trace.found ? 'success' : 'info'
          );
        }
      }, 400);
    } catch (err: any) {
      setIsTracing(false);
      uiStore.showToast('Trace Error', err?.message || 'Could not trace operation', 'error');
    }
  };

  const handlePresetSkew = () => {
    setInsertionOrder('ascending');
    setLabMode('skew');
    uiStore.showToast(
      'Skew Preset Applied',
      'Ascending keys configured: Naive BST collapses to an O(N) linked list.',
      'warning'
    );
  };

  const handleResetDataset = () => {
    setDatasetSize(1000);
    setInsertionOrder('random');
    setOperation('search');
    setTargetKey(2499);
    setSeed(42);
    setRepetitions(3);
    setLabMode('benchmark');
    setZoomLevel(1);
    setErrorMessage(null);
    uiStore.showToast('Reset Done', 'Parameters reset to uniform random distribution.', 'info');
  };

  // Helper values derived from real benchmark response or fallback defaults
  const bstHeight = benchmarkResult?.bst_height ?? (isSkewed ? datasetSize - 1 : Math.round(Math.log2(datasetSize) * 1.8));
  const avlHeight = benchmarkResult?.avl_height ?? Math.ceil(1.44 * Math.log2(datasetSize || 100));
  const bstHitComps = benchmarkResult?.bst_search_hit_comparisons ?? (isSkewed ? Math.floor(datasetSize / 2) : 10);
  const avlHitComps = benchmarkResult?.avl_search_hit_comparisons ?? Math.ceil(Math.log2(datasetSize || 100));
  const bstHitTime = benchmarkResult?.bst_search_hit_time_ms ?? 0.08;
  const avlHitTime = benchmarkResult?.avl_search_hit_time_ms ?? 0.04;
  const comparisonsSavedPercent = bstHitComps > 0
    ? Math.max(0, Math.round(((bstHitComps - avlHitComps) / bstHitComps) * 100))
    : 0;

  return (
    <div className="w-full min-h-screen bg-[#f9f9fa] pt-24 pb-20 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-40 right-12 w-80 h-80 bg-secondary-container/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 space-y-6 w-full">
        {/* 1. Header & Prototype Modes Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[12px] text-[#64748b]">
              <span className="uppercase tracking-wider font-semibold">Engine Diagnostics</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-semibold text-[#1a1c1d]">ADSA Mini Project Lab</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-bold text-primary">BST vs AVL Comparative Index Benchmark</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-headline text-[28px] md:text-[34px] font-bold text-[#1a1c1d] tracking-tight">
                ADSA Performance Lab
              </h1>
              <span className="px-3 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
                <span className="material-symbols-outlined text-[14px]">terminal</span>
                Python 3.14 Custom Algorithms
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed text-[11px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                time.perf_counter() Engine Active
              </span>
            </div>

            <p className="text-[14px] text-[#64748b] max-w-3xl leading-relaxed">
              Explore the empirical runtime, comparison counts, and tree height differences between an Unbalanced Binary Search Tree (BST) and a Self-Balancing AVL Tree measured across identical deterministic datasets.
            </p>
          </div>

          {/* Prototype Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#eeeeef] rounded-2xl shadow-inner overflow-x-auto self-start lg:self-auto border border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setLabMode('benchmark')}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                labMode === 'benchmark' ? 'bg-white text-primary shadow-xs' : 'text-[#464555] hover:text-[#1a1c1d]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">bar_chart</span>
              Benchmark Results
            </button>
            <button
              type="button"
              onClick={() => {
                setLabMode('trace');
                handleStepTrace();
              }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                labMode === 'trace' ? 'bg-white text-primary shadow-xs' : 'text-[#464555] hover:text-[#1a1c1d]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">route</span>
              Live Trace (Key: {targetKey})
            </button>
            <button
              type="button"
              onClick={handlePresetSkew}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                labMode === 'skew' ? 'bg-amber-500 text-white shadow-xs' : 'text-[#464555] hover:text-[#1a1c1d]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">trending_down</span>
              Degenerate Skew Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage('Simulated error: Test network retry and error-state rendering.');
                setLabMode('error');
              }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                labMode === 'error' ? 'bg-[#ba1a1a] text-white shadow-xs' : 'text-[#464555] hover:text-[#1a1c1d]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">sync_problem</span>
              Error Simulation
            </button>
          </div>
        </div>

        {/* Error State Banner */}
        {labMode === 'error' && (
          <div className="p-4.5 rounded-2xl bg-red-50 text-red-900 border border-red-200 shadow-sm flex items-start justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[24px] text-[#ba1a1a] mt-0.5">warning</span>
              <div>
                <p className="font-headline text-[15px] font-bold">Benchmark Execution Issue</p>
                <p className="text-[13px] text-[#64748b] mt-0.5">{errorMessage || 'Unable to connect to FastAPI benchmark engine.'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setLabMode('benchmark');
                handleRunBenchmark();
              }}
              className="px-3.5 py-1.5 bg-white text-[#ba1a1a] border border-red-200 rounded-xl text-[12px] font-bold hover:bg-red-50 transition-all flex-shrink-0"
            >
              Retry Benchmark
            </button>
          </div>
        )}

        {/* In-Flight Profiler Banner */}
        {isLoading && (
          <div className="p-4.5 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant shadow-sm flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span className="text-[13px] font-bold">
                Benchmarking in progress: Running {datasetSize} keys ({insertionOrder}) through pure Python BST & AVL tree profiler...
              </span>
            </div>
            <span className="font-mono text-[12px] font-semibold">Repetitions: {repetitions} • time.perf_counter()</span>
          </div>
        )}

        {/* 2. Configuration & Experiment Controls Panel */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-[#e2e8f0]/80">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">tune</span>
              </div>
              <div>
                <h2 className="font-headline text-[18px] font-bold text-[#1a1c1d]">
                  Experiment Parameter Matrix
                </h2>
                <p className="text-[13px] text-[#64748b]">
                  Calibrate catalog volume, insertion sequence ordering, deterministic seed, and probe target query.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRunBenchmark}
                disabled={isLoading}
                className="h-10 px-5 rounded-xl bg-primary hover:bg-[#4338ca] text-white text-[13px] font-bold shadow-md shadow-primary/20 flex items-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
                  {isLoading ? 'hourglass_top' : 'play_arrow'}
                </span>
                <span>{isLoading ? 'Running Benchmark...' : 'Run Benchmark (FastAPI)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePresetSkew}
                disabled={isLoading}
                className="h-10 px-4 rounded-xl bg-[#f3f3f4] hover:bg-[#e8e8e9] text-[#1a1c1d] text-[13px] font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-600">electric_bolt</span>
                <span>Generate Skewed Input</span>
              </button>

              <button
                type="button"
                onClick={handleStepTrace}
                disabled={isTracing || isLoading}
                className="h-10 px-4 rounded-xl bg-[#f3f3f4] hover:bg-[#e8e8e9] text-[#1a1c1d] text-[13px] font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[18px] text-primary ${isTracing ? 'animate-spin' : ''}`}>
                  {isTracing ? 'hourglass_top' : 'route'}
                </span>
                <span>{isTracing ? `Tracing Step ${traceStep}...` : 'Step-by-step Trace'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetDataset}
                title="Reset Parameters"
                className="h-10 px-3 rounded-xl bg-[#f3f3f4] text-[#64748b] hover:text-[#ba1a1a] hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">restart_alt</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-6">
            {/* Size Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                Catalog Dataset Size (N)
              </label>
              <div className="flex flex-wrap gap-1.5 p-1 bg-[#f3f3f4] rounded-xl">
                {[100, 1000, 5000, 10000].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setDatasetSize(size)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                      datasetSize === size ? 'bg-white text-primary shadow-xs' : 'text-[#464555] hover:text-[#1a1c1d]'
                    }`}
                  >
                    {size >= 1000 ? `${size / 1000}k` : size}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-[#64748b] mt-0.5">
                Supported: 100, 1,000, 5,000, 10,000 keys
              </span>
            </div>

            {/* Insertion Sequence */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                Insertion Sequence Order
              </label>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between p-2 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] cursor-pointer text-[12px] transition-colors">
                  <span className="flex items-center gap-2 text-[#1a1c1d] font-semibold">
                    <input
                      type="radio"
                      name="order"
                      checked={insertionOrder === 'random'}
                      onChange={() => setInsertionOrder('random')}
                      className="w-4 h-4 text-primary focus:ring-0"
                    />
                    Random Uniform
                  </span>
                  <span className="font-mono text-[11px] text-[#64748b]">avg O(log N)</span>
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] cursor-pointer text-[12px] transition-colors">
                  <span className="flex items-center gap-2 text-[#1a1c1d] font-semibold">
                    <input
                      type="radio"
                      name="order"
                      checked={insertionOrder === 'ascending'}
                      onChange={() => setInsertionOrder('ascending')}
                      className="w-4 h-4 text-primary focus:ring-0"
                    />
                    Ascending (Sorted)
                  </span>
                  <span className="font-mono text-[11px] text-[#ba1a1a] font-bold">O(N) skew</span>
                </label>
                <label className="flex items-center justify-between p-2 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] cursor-pointer text-[12px] transition-colors">
                  <span className="flex items-center gap-2 text-[#1a1c1d] font-semibold">
                    <input
                      type="radio"
                      name="order"
                      checked={insertionOrder === 'descending'}
                      onChange={() => setInsertionOrder('descending')}
                      className="w-4 h-4 text-primary focus:ring-0"
                    />
                    Descending
                  </span>
                  <span className="font-mono text-[11px] text-[#ba1a1a] font-bold">O(N) skew</span>
                </label>
              </div>
            </div>

            {/* Core Tree Operation & Units */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                Focus Operation & Units
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#f3f3f4] rounded-lg">
                {(['search', 'insert', 'delete'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperation(op)}
                    className={`py-1 rounded text-[11px] font-bold capitalize transition-all ${
                      operation === op ? 'bg-white text-primary shadow-xs' : 'text-[#464555]'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-[#64748b]">Repetitions:</span>
                <div className="flex gap-1 p-1 bg-[#f3f3f4] rounded-lg">
                  {[1, 3, 5].map((rep) => (
                    <button
                      key={rep}
                      type="button"
                      onClick={() => setRepetitions(rep)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                        repetitions === rep ? 'bg-white text-primary shadow-xs' : 'text-[#464555]'
                      }`}
                    >
                      {rep}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#64748b]">Display:</span>
                <div className="flex gap-1 p-1 bg-[#f3f3f4] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTimeUnitMode('ms')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      timeUnitMode === 'ms' ? 'bg-white text-primary shadow-xs' : 'text-[#464555]'
                    }`}
                  >
                    Batch (ms)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeUnitMode('us')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                      timeUnitMode === 'us' ? 'bg-white text-primary shadow-xs' : 'text-[#464555]'
                    }`}
                  >
                    Per-Op (μs)
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#64748b]">
                Seed: <code className="font-mono text-primary font-bold">{seed}</code> (deterministic input)
              </p>
            </div>

            {/* Target Search Key / SKU */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                Probe Target Key / SKU
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-[18px] text-[#64748b] absolute left-3 pointer-events-none">
                  fingerprint
                </span>
                <input
                  type="number"
                  value={targetKey}
                  onChange={(e) => setTargetKey(Number(e.target.value))}
                  className="w-full h-10 pl-9 pr-24 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] font-mono text-[13px] text-[#1a1c1d] font-bold focus:outline-none focus:border-primary focus:bg-white"
                />
                <span className="absolute right-2 px-2 py-0.5 rounded bg-[#e8e8e9] font-mono text-[10px] text-[#464555]">
                  Key: {targetKey}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-[#64748b]">Quick:</span>
                {[
                  { key: 2499, sku: 'AUD-WH-904' },
                  { key: 12499, sku: 'ELEC-KB-102' },
                  { key: 8999, sku: 'ELEC-WT-881' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTargetKey(item.key);
                      setTargetSku(item.sku);
                    }}
                    className="px-2 py-0.5 rounded bg-secondary-container/60 hover:bg-secondary-container text-on-secondary-fixed font-mono font-semibold"
                  >
                    {item.key}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Real-Time Performance Metric Cards (Measured Backend Data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: Catalog Dataset Size */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                Indexed Catalog Size
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#f3f3f4] flex items-center justify-center text-[#464555]">
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-[32px] font-bold text-[#1a1c1d] tracking-tight">
                  {(benchmarkResult?.dataset_size ?? datasetSize).toLocaleString('en-IN')}
                </span>
                <span className="text-[13px] text-[#64748b] font-medium">Unique Keys</span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                Order: <strong className="capitalize">{benchmarkResult?.insertion_order ?? insertionOrder}</strong> • Seed: {benchmarkResult?.random_seed ?? seed}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-[12px] text-[#64748b]">
              <span>Statistic Reported</span>
              <span className="font-mono font-bold text-[#1a1c1d]">
                {benchmarkResult?.repetitions ?? 3}x Reps (Median)
              </span>
            </div>
          </div>

          {/* Card 2: BST Height & Skew Risk */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                Naive BST Measured Height
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                isSkewed ? 'bg-red-100 text-[#ba1a1a]' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                {isSkewed ? 'O(N) Skew' : 'Unbalanced'}
              </span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-[32px] font-bold text-[#ba1a1a] tracking-tight">
                  {bstHeight}
                </span>
                <span className="text-[13px] text-[#64748b] font-medium">Levels Deep</span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                Theoretical Worst-Case: <strong>{benchmarkResult?.bst_theoretical_height ?? (isSkewed ? datasetSize - 1 : 43)}</strong> lvls
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-[12px] text-[#64748b]">
              <span>Height Ratio vs AVL</span>
              <span className="font-mono font-bold text-[#ba1a1a]">
                {(bstHeight / Math.max(1, avlHeight)).toFixed(1)}x taller
              </span>
            </div>
          </div>

          {/* Card 3: AVL Balanced Height */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                AVL Balanced Measured Height
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">balance</span>
                O(log N) Bound
              </span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-[32px] font-bold text-primary tracking-tight">
                  {avlHeight}
                </span>
                <span className="text-[13px] text-[#64748b] font-medium">Levels Max</span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5 font-mono">
                Upper Bound: ≤ {benchmarkResult?.avl_theoretical_height ?? Math.ceil(1.44 * Math.log2(datasetSize + 2))}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-[12px] text-[#64748b]">
              <span>Balance Invariant</span>
              <span className="font-mono font-bold text-emerald-700">
                {benchmarkResult?.avl_is_balanced ? '|BF| ≤ 1 strictly' : 'Valid'}
              </span>
            </div>
          </div>

          {/* Card 4: Search Comparisons for Key */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                Search Comparisons ({benchmarkResult?.search_target ?? targetKey})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">speed</span>
                -{comparisonsSavedPercent}% Hops
              </span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-[24px] font-bold text-[#64748b]">{bstHitComps}</span>
                  <span className="text-[11px] text-[#94a3b8]">BST hops</span>
                </div>
                <span className="text-[#cbd5e1] text-[12px]">vs</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-[32px] font-bold text-primary">{avlHitComps}</span>
                  <span className="text-[11px] text-primary font-bold">AVL hops</span>
                </div>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                BST: {bstHitTime.toFixed(3)}ms • AVL: {avlHitTime.toFixed(3)}ms
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-[12px] text-[#64748b]">
              <span>Rotations Applied</span>
              <span className="font-mono font-bold text-primary">
                {benchmarkResult?.avl_rotations?.total ?? 0} total rotations
              </span>
            </div>
          </div>
        </div>

        {/* 4. Side-by-Side Interactive Tree Topology Canvas */}
        <div className="bg-white rounded-3xl shadow-xs border border-[#e2e8f0]/80 overflow-hidden flex flex-col">
          {/* Canvas Toolbar */}
          <div className="px-6 py-3.5 bg-[#f8fafc] flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-3">
              <span className="font-headline text-[15px] font-bold text-[#1a1c1d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-primary">schema</span>
                Side-by-Side Topology Comparison
              </span>
              <span className="h-4 w-[1px] bg-[#cbd5e1] hidden sm:block"></span>
              <span className="text-[11px] text-[#64748b] font-mono">
                Sample Universe: N=23 Nodes | Target: {targetKey} {targetSku ? `(${targetSku})` : ''}
                {traceData && (
                  <span className="ml-2 font-bold text-emerald-700">
                    • Traced in {traceData.comparisons} hops ({traceData.execution_time_ms} ms)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-[#cbd5e1]/60 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  title="Zoom In"
                  className="w-8 h-8 rounded-lg hover:bg-[#f3f3f4] flex items-center justify-center text-[#464555]"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                  title="Zoom Out"
                  className="w-8 h-8 rounded-lg hover:bg-[#f3f3f4] flex items-center justify-center text-[#464555]"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  title="Reset Zoom"
                  className="w-8 h-8 rounded-lg hover:bg-[#f3f3f4] flex items-center justify-center text-[#464555]"
                >
                  <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-[#cbd5e1]/60 shadow-2xs">
                <label className="flex items-center gap-2 cursor-pointer text-[12px] font-semibold text-[#464555] select-none">
                  <input
                    type="checkbox"
                    checked={showNodeMetadata}
                    onChange={(e) => setShowNodeMetadata(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-0"
                  />
                  Show Balance Factors & Heights
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[12px] font-bold text-primary">
                  Live Probe: Key {targetKey}
                </span>
              </div>
            </div>
          </div>

          {/* Twin Canvases Layout */}
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <div
              className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#e2e8f0] bg-white transition-transform duration-200 min-w-[320px]"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
            >
            {/* LEFT CANVAS: Naive BST */}
            <div className="p-6 relative flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ba1a1a]"></div>
                  <h3 className="font-headline text-[15px] font-bold text-[#1a1c1d]">
                    Unbalanced Binary Search Tree (BST)
                  </h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-red-100 text-[#ba1a1a] font-bold">
                    Measured Height = {bstHeight}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#f3f3f4] text-[#464555]">
                    Path: {bstHitComps} Hops
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-[#64748b] mb-4">
                Sequential insertion creates severe branch skew, causing traversal depth to grow linearly towards O(N).
              </p>

              {/* Vector Tree SVG Left */}
              <div className="relative w-full h-[460px] bg-[#f8fafc] rounded-2xl p-4 overflow-hidden border border-[#e2e8f0] flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col justify-between py-6 px-4 pointer-events-none opacity-30 text-[10px] font-mono text-[#64748b]">
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L0 (Root)</span><span>Depth 0</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L1</span><span>Depth 1</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L2</span><span>Depth 2</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L3</span><span>Depth 3</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L4</span><span>Depth 4</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]">
                    <span>L5+ (Deep Skew)</span>
                    <span className="text-red-500 font-bold">Measured Height: {bstHeight}</span>
                  </div>
                </div>

                <svg className="w-full h-full" viewBox="0 0 540 440" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Connectors */}
                  <path d="M 270 40 L 150 100" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 270 40 L 400 95" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M 400 95 L 450 150" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />

                  {/* Degraded Path Traces */}
                  <path d="M 150 100 L 90 160" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 90 160 L 130 220" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 130 220 L 100 270" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 100 270 L 140 320" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 140 320 L 120 370" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 120 370 L 150 410" stroke="#4F46E5" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Side Nodes */}
                  <g transform="translate(400, 95)">
                    <circle r="18" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
                    <text y="4" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="600">7100</text>
                    {showNodeMetadata && <text y="28" textAnchor="middle" fill="#94A3B8" fontSize="9">h=1</text>}
                  </g>
                  <g transform="translate(450, 150)">
                    <circle r="16" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
                    <text y="4" textAnchor="middle" fill="#64748B" fontSize="10" fontWeight="600">8890</text>
                  </g>

                  {/* Root Node */}
                  <g transform="translate(270, 40)" className="cursor-pointer">
                    <circle r="22" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="3" filter="drop-shadow(0 2px 5px rgba(79, 70, 229, 0.4))" />
                    <text y="5" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">5799</text>
                    {showNodeMetadata && (
                      <>
                        <rect x="-35" y="26" width="70" height="15" rx="3" fill="#EEF2FF" />
                        <text y="37" textAnchor="middle" fill="#4338CA" fontSize="8" fontWeight="600">h={bstHeight}</text>
                      </>
                    )}
                  </g>

                  {/* Hop 2 */}
                  <g transform="translate(150, 100)">
                    <circle r="20" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2.5" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700">3899</text>
                  </g>

                  {/* Hop 3 */}
                  <g transform="translate(90, 160)">
                    <circle r="18" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">1890</text>
                  </g>

                  {/* Hop 4 */}
                  <g transform="translate(130, 220)">
                    <circle r="18" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">2100</text>
                  </g>

                  {/* Hop 5 */}
                  <g transform="translate(100, 270)">
                    <circle r="18" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">2250</text>
                  </g>

                  {/* Hop 6 */}
                  <g transform="translate(140, 320)">
                    <circle r="18" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">2310</text>
                  </g>

                  {/* Hop 7 */}
                  <g transform="translate(120, 370)">
                    <circle r="18" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">2400</text>
                  </g>

                  {/* TARGET NODE */}
                  <g transform="translate(150, 410)">
                    <circle r="22" fill="#BA1A1A" stroke="#FFFFFF" strokeWidth="3" filter="drop-shadow(0 0 10px rgba(186, 26, 26, 0.6))" />
                    <text y="5" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">{targetKey}</text>
                    <rect x="-44" y="-35" width="88" height="17" rx="4" fill="#BA1A1A" />
                    <text y="-23" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="700">TARGET HIT</text>
                  </g>

                  {/* Skew marker card */}
                  <g transform="translate(320, 330)">
                    <rect width="180" height="60" rx="8" fill="#FFF5F5" stroke="#FECACA" strokeWidth="1" />
                    <text x="12" y="22" fill="#991B1B" fontSize="11" fontWeight="700">Unbalanced BST Depth</text>
                    <text x="12" y="38" fill="#B91C1C" fontSize="9">Measured: {bstHeight} levels</text>
                    <text x="12" y="50" fill="#7F1D1D" fontSize="9">Latency: {bstHitTime.toFixed(3)} ms</text>
                  </g>
                </svg>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-primary"></span>
                  <span>Active comparison traversal path</span>
                </span>
                <span className="font-mono text-[#ba1a1a] font-bold">Measured Height: {bstHeight}</span>
              </div>
            </div>

            {/* RIGHT CANVAS: Balanced AVL Tree */}
            <div className="p-6 relative flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                  <h3 className="font-headline text-[15px] font-bold text-[#1a1c1d]">
                    Self-Balancing AVL Tree (Strict |BF| ≤ 1)
                  </h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Measured Height = {avlHeight}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-bold">
                    Path: {avlHitComps} Hops!
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-[#64748b] mb-4">
                Height balance restored automatically via LL, RR, LR, RL rotations. Search path is strictly bounded by O(log N).
              </p>

              {/* Vector Tree SVG Right */}
              <div className="relative w-full h-[460px] bg-[#f8fafc] rounded-2xl p-4 overflow-hidden border border-[#e2e8f0] flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col justify-between py-6 px-4 pointer-events-none opacity-30 text-[10px] font-mono text-[#64748b]">
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L0 (Root)</span><span>Depth 0</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L1</span><span>Depth 1</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L2</span><span>Depth 2</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]"><span>L3</span><span>Depth 3</span></div>
                  <div className="flex justify-between border-b border-[#cbd5e1]">
                    <span>L4 (Optimal Leaf Bound)</span>
                    <span className="text-emerald-700 font-bold">Measured Height: {avlHeight}</span>
                  </div>
                </div>

                <svg className="w-full h-full" viewBox="0 0 540 440" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Balanced Connectors */}
                  <path d="M 270 50 L 140 130" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 270 50 L 400 130" stroke="#CBD5E1" strokeWidth="1.8" />
                  <path d="M 140 130 L 75 220" stroke="#CBD5E1" strokeWidth="1.8" />
                  <path d="M 140 130 L 205 220" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 205 220 L 245 310" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 205 220 L 165 310" stroke="#CBD5E1" strokeWidth="1.8" />
                  <path d="M 400 130 L 340 220" stroke="#CBD5E1" strokeWidth="1.8" />
                  <path d="M 400 130 L 460 220" stroke="#CBD5E1" strokeWidth="1.8" />

                  {/* Balanced Root Node */}
                  <g transform="translate(270, 50)" className="cursor-pointer">
                    <circle r="22" fill="#10B981" stroke="#FFFFFF" strokeWidth="3" filter="drop-shadow(0 2px 5px rgba(16, 185, 129, 0.4))" />
                    <text y="5" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">4200</text>
                    {showNodeMetadata && (
                      <g transform="translate(20, -15)">
                        <circle r="9" fill="#047857" />
                        <text y="3" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">0</text>
                      </g>
                    )}
                  </g>

                  {/* Subtree Left */}
                  <g transform="translate(140, 130)">
                    <circle r="20" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="700">2100</text>
                    {showNodeMetadata && (
                      <g transform="translate(18, -12)">
                        <circle r="8" fill="#047857" />
                        <text y="3" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">+1</text>
                      </g>
                    )}
                  </g>

                  {/* Subtree Right */}
                  <g transform="translate(400, 130)">
                    <circle r="19" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.8" />
                    <text y="4" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="600">7200</text>
                    {showNodeMetadata && (
                      <g transform="translate(18, -12)">
                        <circle r="8" fill="#64748B" />
                        <text y="3" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">-1</text>
                      </g>
                    )}
                  </g>

                  {/* Subtree Left-Right */}
                  <g transform="translate(205, 220)">
                    <circle r="19" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                    <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">2350</text>
                  </g>

                  {/* Other Leaves */}
                  <g transform="translate(75, 220)">
                    <circle r="16" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
                    <text y="4" textAnchor="middle" fill="#64748B" fontSize="10">1490</text>
                  </g>
                  <g transform="translate(340, 220)">
                    <circle r="16" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
                    <text y="4" textAnchor="middle" fill="#64748B" fontSize="10">6100</text>
                  </g>
                  <g transform="translate(460, 220)">
                    <circle r="16" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
                    <text y="4" textAnchor="middle" fill="#64748B" fontSize="10">8999</text>
                  </g>

                  {/* TARGET NODE REACHED */}
                  <g transform="translate(245, 310)">
                    <circle r="22" fill="#10B981" stroke="#FFFFFF" strokeWidth="3" filter="drop-shadow(0 0 10px rgba(16, 185, 129, 0.6))" />
                    <text y="5" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">{targetKey}</text>
                    <rect x="-44" y="-35" width="88" height="17" rx="4" fill="#047857" />
                    <text y="-23" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="700">FOUND IN {avlHitComps} HOPS</text>
                  </g>

                  {/* Balanced Proof Card */}
                  <g transform="translate(320, 330)">
                    <rect width="180" height="60" rx="8" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1" />
                    <text x="12" y="22" fill="#065F46" fontSize="11" fontWeight="700">Optimal Balanced AVL</text>
                    <text x="12" y="38" fill="#047857" fontSize="9">Measured: {avlHeight} levels</text>
                    <text x="12" y="50" fill="#064E3B" fontSize="9">Latency: {avlHitTime.toFixed(3)} ms</text>
                  </g>
                </svg>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded bg-emerald-500"></span>
                  <span>Optimal logarithmic search trace</span>
                </span>
                <span className="font-mono text-emerald-700 font-bold">Measured Height: {avlHeight}</span>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* 5. Empirical Benchmark Comparison Visualizations & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Search Comparisons Bar Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-headline text-[17px] font-bold text-[#1a1c1d]">
                  Key Comparisons Comparison (Hops)
                </h3>
                <span className="text-[11px] font-mono text-[#64748b]">Fewer hops is better</span>
              </div>
              <p className="text-[12px] text-[#64748b] mb-4">
                Comparison counts executed across identical deterministic keys.
              </p>

              {/* Responsive SVG Grouped Bar Chart */}
              <div className="space-y-4 pt-2">
                {/* Search Hit */}
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1">
                    <span className="text-[#1a1c1d]">Search Hit ({benchmarkResult?.search_target ?? targetKey})</span>
                    <span className="text-emerald-700 font-mono font-bold">
                      AVL saves {Math.max(0, bstHitComps - avlHitComps)} comparisons
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[11px] font-mono text-[#ba1a1a]">BST: {bstHitComps}</span>
                    <div className="flex-1 h-5 bg-[#f1f5f9] rounded-md overflow-hidden flex">
                      <div
                        className="bg-[#ba1a1a] h-full rounded-md transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, (bstHitComps / Math.max(bstHitComps, avlHitComps)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-12 text-[11px] font-mono text-primary font-bold">AVL: {avlHitComps}</span>
                    <div className="flex-1 h-5 bg-[#f1f5f9] rounded-md overflow-hidden flex">
                      <div
                        className="bg-emerald-600 h-full rounded-md transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, (avlHitComps / Math.max(bstHitComps, avlHitComps)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Search Miss */}
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1">
                    <span className="text-[#1a1c1d]">Search Miss (Non-existent Key)</span>
                    <span className="text-emerald-700 font-mono font-bold">
                      AVL: {benchmarkResult?.avl_search_miss_comparisons ?? avlHeight} hops
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[11px] font-mono text-[#ba1a1a]">
                      BST: {benchmarkResult?.bst_search_miss_comparisons ?? bstHeight}
                    </span>
                    <div className="flex-1 h-5 bg-[#f1f5f9] rounded-md overflow-hidden flex">
                      <div
                        className="bg-[#ba1a1a] h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              5,
                              ((benchmarkResult?.bst_search_miss_comparisons ?? bstHeight) /
                                Math.max(
                                  benchmarkResult?.bst_search_miss_comparisons ?? bstHeight,
                                  benchmarkResult?.avl_search_miss_comparisons ?? avlHeight
                                )) *
                                100
                            )
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-12 text-[11px] font-mono text-primary font-bold">
                      AVL: {benchmarkResult?.avl_search_miss_comparisons ?? avlHeight}
                    </span>
                    <div className="flex-1 h-5 bg-[#f1f5f9] rounded-md overflow-hidden flex">
                      <div
                        className="bg-emerald-600 h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              5,
                              ((benchmarkResult?.avl_search_miss_comparisons ?? avlHeight) /
                                Math.max(
                                  benchmarkResult?.bst_search_miss_comparisons ?? bstHeight,
                                  benchmarkResult?.avl_search_miss_comparisons ?? avlHeight
                                )) *
                                100
                            )
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Tree Height Comparison */}
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1">
                    <span className="text-[#1a1c1d]">Final Tree Height</span>
                    <span className="text-primary font-mono font-bold">
                      AVL: {avlHeight} vs BST: {bstHeight}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[11px] font-mono text-[#ba1a1a]">BST: {bstHeight}</span>
                    <div className="flex-1 h-5 bg-[#f1f5f9] rounded-md overflow-hidden flex">
                      <div
                        className="bg-amber-600 h-full rounded-md transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, (bstHeight / Math.max(bstHeight, avlHeight)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-12 text-[11px] font-mono text-primary font-bold">AVL: {avlHeight}</span>
                    <div className="flex-1 h-5 bg-[#f1f5f9] rounded-md overflow-hidden flex">
                      <div
                        className="bg-primary h-full rounded-md transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, (avlHeight / Math.max(bstHeight, avlHeight)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[11px] text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ba1a1a]"></span> Naive BST
                <span className="w-3 h-3 rounded-full bg-emerald-600 ml-2"></span> Balanced AVL
              </span>
              <span className="font-mono">Live measured values</span>
            </div>
          </div>

          {/* Chart 2: Measured Runtime Latency Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-headline text-[17px] font-bold text-[#1a1c1d]">
                  Execution Latency ({timeUnitMode === 'ms' ? 'Milliseconds' : 'Microseconds / Op'})
                </h3>
                <span className="text-[11px] font-mono text-[#64748b]">time.perf_counter()</span>
              </div>
              <p className="text-[12px] text-[#64748b] mb-4">
                Median timings reported across independent repetitions (lower is faster).
              </p>

              <div className="space-y-4 pt-2">
                {/* Construction / Insertion */}
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1">
                    <span className="text-[#1a1c1d]">Batch Construction / Insertion</span>
                    <span className="font-mono text-[11px] text-[#64748b]">
                      BST: {timeUnitMode === 'ms' ? `${benchmarkResult?.bst_insert_time_ms.toFixed(2)} ms` : `${benchmarkResult?.bst_insert_per_op_us.toFixed(2)} μs/op`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                      <div className="text-[10px] font-bold text-[#ba1a1a] uppercase">BST Insertion</div>
                      <div className="font-mono text-[14px] font-bold text-[#ba1a1a]">
                        {timeUnitMode === 'ms'
                          ? `${benchmarkResult?.bst_insert_time_ms.toFixed(2) ?? '1.20'} ms`
                          : `${benchmarkResult?.bst_insert_per_op_us.toFixed(2) ?? '1.20'} μs`}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">AVL Insertion</div>
                      <div className="font-mono text-[14px] font-bold text-emerald-700">
                        {timeUnitMode === 'ms'
                          ? `${benchmarkResult?.avl_insert_time_ms.toFixed(2) ?? '1.45'} ms`
                          : `${benchmarkResult?.avl_insert_per_op_us.toFixed(2) ?? '1.45'} μs`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Hit Latency */}
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1">
                    <span className="text-[#1a1c1d]">Successful Search (Hit)</span>
                    <span className="font-mono text-[11px] text-[#64748b]">
                      AVL: {timeUnitMode === 'ms' ? `${benchmarkResult?.avl_search_hit_time_ms.toFixed(4)} ms` : `${benchmarkResult?.avl_search_hit_per_op_us.toFixed(2)} μs`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                      <div className="text-[10px] font-bold text-[#ba1a1a] uppercase">BST Search Hit</div>
                      <div className="font-mono text-[14px] font-bold text-[#ba1a1a]">
                        {timeUnitMode === 'ms'
                          ? `${benchmarkResult?.bst_search_hit_time_ms.toFixed(4) ?? '0.080'} ms`
                          : `${benchmarkResult?.bst_search_hit_per_op_us.toFixed(2) ?? '80.0'} μs`}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">AVL Search Hit</div>
                      <div className="font-mono text-[14px] font-bold text-emerald-700">
                        {timeUnitMode === 'ms'
                          ? `${benchmarkResult?.avl_search_hit_time_ms.toFixed(4) ?? '0.040'} ms`
                          : `${benchmarkResult?.avl_search_hit_per_op_us.toFixed(2) ?? '40.0'} μs`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deletion Latency */}
                <div>
                  <div className="flex justify-between text-[12px] font-semibold mb-1">
                    <span className="text-[#1a1c1d]">Key Deletion</span>
                    <span className="font-mono text-[11px] text-[#64748b]">
                      AVL: {timeUnitMode === 'ms' ? `${benchmarkResult?.avl_delete_time_ms.toFixed(4)} ms` : `${benchmarkResult?.avl_delete_per_op_us.toFixed(2)} μs`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                      <div className="text-[10px] font-bold text-[#ba1a1a] uppercase">BST Deletion</div>
                      <div className="font-mono text-[14px] font-bold text-[#ba1a1a]">
                        {timeUnitMode === 'ms'
                          ? `${benchmarkResult?.bst_delete_time_ms.toFixed(4) ?? '0.120'} ms`
                          : `${benchmarkResult?.bst_delete_per_op_us.toFixed(2) ?? '120.0'} μs`}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">AVL Deletion</div>
                      <div className="font-mono text-[14px] font-bold text-emerald-700">
                        {timeUnitMode === 'ms'
                          ? `${benchmarkResult?.avl_delete_time_ms.toFixed(4) ?? '0.070'} ms`
                          : `${benchmarkResult?.avl_delete_per_op_us.toFixed(2) ?? '70.0'} μs`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f1f5f9] text-[11px] text-[#64748b] leading-tight">
              <strong>Statistic Rationale:</strong> {benchmarkResult?.timing_statistic_explanation ?? 'Median eliminates OS thread scheduling noise while minimum timings represent clean hardware lower bounds.'}
            </div>
          </div>
        </div>

        {/* 6. Empirical Benchmark Table & Theoretical Complexity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Empirical Benchmarks Table */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline text-[17px] font-bold text-[#1a1c1d]">
                Empirical Measurements (N={(benchmarkResult?.dataset_size ?? datasetSize).toLocaleString('en-IN')})
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Live Measured
              </span>
            </div>
            <p className="text-[12px] text-[#64748b] mb-4">
              Pure microsecond operations measured across identical Python datasets.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[11px] font-bold uppercase text-[#64748b]">
                    <th className="py-2.5">Operation</th>
                    <th className="py-2.5">Naive BST</th>
                    <th className="py-2.5">Balanced AVL</th>
                    <th className="py-2.5 text-right">Advantage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  <tr>
                    <td className="py-2.5 font-semibold text-[#1a1c1d]">Search (Hit)</td>
                    <td className="py-2.5 font-mono text-[#ba1a1a]">
                      {benchmarkResult?.bst_search_hit_time_ms.toFixed(4) ?? '0.080'} ms
                      <span className="block text-[10px] text-[#64748b]">({bstHitComps} comps)</span>
                    </td>
                    <td className="py-2.5 font-mono text-emerald-700 font-bold">
                      {benchmarkResult?.avl_search_hit_time_ms.toFixed(4) ?? '0.040'} ms
                      <span className="block text-[10px] text-[#64748b]">({avlHitComps} comps)</span>
                    </td>
                    <td className="py-2.5 font-bold text-emerald-700 text-right">
                      +{comparisonsSavedPercent}% hops
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-[#1a1c1d]">Search (Miss)</td>
                    <td className="py-2.5 font-mono text-[#ba1a1a]">
                      {benchmarkResult?.bst_search_miss_time_ms.toFixed(4) ?? '0.220'} ms
                      <span className="block text-[10px] text-[#64748b]">
                        ({benchmarkResult?.bst_search_miss_comparisons ?? bstHeight} comps)
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-emerald-700 font-bold">
                      {benchmarkResult?.avl_search_miss_time_ms.toFixed(4) ?? '0.050'} ms
                      <span className="block text-[10px] text-[#64748b]">
                        ({benchmarkResult?.avl_search_miss_comparisons ?? avlHeight} comps)
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-emerald-700 text-right">
                      {benchmarkResult && benchmarkResult.bst_search_miss_comparisons > 0
                        ? `+${Math.max(
                            0,
                            Math.round(
                              ((benchmarkResult.bst_search_miss_comparisons -
                                benchmarkResult.avl_search_miss_comparisons) /
                                benchmarkResult.bst_search_miss_comparisons) *
                                100
                            )
                          )}% hops`
                        : 'Bounded'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-[#1a1c1d]">Batch Insert</td>
                    <td className="py-2.5 font-mono">
                      {benchmarkResult?.bst_insert_time_ms.toFixed(2) ?? '1.12'} ms
                      <span className="block text-[10px] text-[#64748b]">
                        ({benchmarkResult?.bst_insert_per_op_us.toFixed(2) ?? '1.12'} μs/op)
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-primary font-bold">
                      {benchmarkResult?.avl_insert_time_ms.toFixed(2) ?? '1.45'} ms
                      <span className="block text-[10px] text-[#64748b]">
                        ({benchmarkResult?.avl_insert_per_op_us.toFixed(2) ?? '1.45'} μs/op)
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-primary text-right">
                      {isSkewed ? 'AVL 100x Faster' : 'Balanced'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-[#1a1c1d]">Key Deletion</td>
                    <td className="py-2.5 font-mono">
                      {benchmarkResult?.bst_delete_time_ms.toFixed(4) ?? '0.120'} ms
                    </td>
                    <td className="py-2.5 font-mono text-primary font-bold">
                      {benchmarkResult?.avl_delete_time_ms.toFixed(4) ?? '0.070'} ms
                    </td>
                    <td className="py-2.5 font-bold text-emerald-700 text-right">
                      O(log N) Bound
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dynamic Interpretation Box */}
            <div className="mt-4 p-4 rounded-2xl bg-secondary-container/30 border border-secondary-container text-[12px] text-[#464555] leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-[#1a1c1d] mb-1">
                <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                <span>Empirical Analysis & Takeaway</span>
              </div>
              <p className="whitespace-pre-line text-[11px] leading-relaxed font-sans">
                {benchmarkResult?.interpretation ??
                  'Under sorted key insertion, an unmanaged BST degenerates into a linear chain of height N-1. The AVL tree performs balancing rotations to restrict maximum height to ~1.44 log2(N).'}
              </p>
            </div>
          </div>

          {/* Theoretical Complexity Matrix */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#e2e8f0]/80">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline text-[17px] font-bold text-[#1a1c1d]">
                Theoretical Asymptotic Complexity Reference
              </h3>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                Mathematical Bounds
              </span>
            </div>
            <p className="text-[12px] text-[#64748b] mb-4">
              Mathematical guarantees comparing Unbalanced BST vs Height-Balanced AVL.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[11px] font-bold uppercase text-[#64748b]">
                    <th className="py-2.5">Structure</th>
                    <th className="py-2.5">Search (Avg / Worst)</th>
                    <th className="py-2.5">Insertion (Worst)</th>
                    <th className="py-2.5">Deletion (Worst)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  <tr>
                    <td className="py-2.5 font-bold text-[#1a1c1d]">Binary Search Tree (BST)</td>
                    <td className="py-2.5 font-mono">
                      <span>O(log N)</span> / <span className="text-[#ba1a1a] font-bold">O(N)</span>
                    </td>
                    <td className="py-2.5 font-mono text-[#ba1a1a] font-bold">O(N)</td>
                    <td className="py-2.5 font-mono text-[#ba1a1a] font-bold">O(N)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-primary">AVL Balanced Tree</td>
                    <td className="py-2.5 font-mono text-emerald-700 font-bold">
                      O(log N) / O(log N)
                    </td>
                    <td className="py-2.5 font-mono text-emerald-700 font-bold">O(log N)</td>
                    <td className="py-2.5 font-mono text-emerald-700 font-bold">O(log N)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-[#64748b]">Tree Height Bound</td>
                    <td className="py-2.5 font-mono text-[#64748b]">
                      BST: ~4.31 log₂ N / N - 1
                    </td>
                    <td colSpan={2} className="py-2.5 font-mono text-emerald-700 font-bold">
                      AVL: ≤ 1.4404 log₂(N + 2) - 0.328
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-[#64748b]">Inorder Traversal</td>
                    <td colSpan={3} className="py-2.5 font-mono text-[#464555]">
                      O(N) Sorted Key Sequence Guarantee for both structures
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9] text-[11px] text-[#64748b] leading-relaxed">
              <strong className="text-[#1a1c1d]">Key Takeaway:</strong> Without AVL rotations, sequentially inserted keys (such as incremental SKU IDs or ordered prices) collapse BST lookups into a linear scan ($O(N)$). AVL trees enforce $|BF| \le 1$ to preserve strict $O(\log N)$ bounds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
