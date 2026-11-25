import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Terminal,
  Play,
  Layers,
  Info,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';
import {
  getGraphRelationships,
  syncFullGraph,
  executeCypherQuery,
  getSystemStatus,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const GraphExplorer = ({ showToast }) => {
  const { user } = useAuth();
  const isLibrarian = user?.role === 'LIBRARIAN';
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [source, setSource] = useState('NEO4J');
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter toggles
  const [filters, setFilters] = useState({
    Author: true,
    Book: true,
    Member: true,
    WROTE: true,
    BORROWED: true,
  });

  // Cypher Console state
  const [cypherQuery, setCypherQuery] = useState(
    'MATCH (m:Member)-[r:BORROWED]->(b:Book) RETURN m.name AS Member, b.title AS Book, r.status AS Status, r.dueDate AS DueDate LIMIT 25'
  );
  const [cypherResults, setCypherResults] = useState(null);
  const [runningCypher, setRunningCypher] = useState(false);
  const [showConsole, setShowConsole] = useState(false);

  // Canvas / SVG force layout references
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node position simulation state
  const [nodePositions, setNodePositions] = useState({});
  const [draggingNodeId, setDraggingNodeId] = useState(null);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      const res = await getGraphRelationships();
      setSource(res.data?.source || 'NEO4J');
      const nodes = res.data?.nodes || [];
      const links = res.data?.links || [];

      setGraphData({ nodes, links });

      // Initialize radial/force positions
      const positions = {};
      const width = 800;
      const height = 500;
      const centerX = width / 2;
      const centerY = height / 2;

      // Cluster by label
      nodes.forEach((node, idx) => {
        let baseAngle = (idx / (nodes.length || 1)) * 2 * Math.PI;
        let radius = 180;
        if (node.label === 'Author') radius = 120;
        if (node.label === 'Book') radius = 220;
        if (node.label === 'Member') radius = 320;

        positions[node.id] = {
          x: centerX + radius * Math.cos(baseAngle) + (Math.random() - 0.5) * 40,
          y: centerY + radius * Math.sin(baseAngle) + (Math.random() - 0.5) * 40,
        };
      });

      setNodePositions(positions);
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleSyncGraph = async () => {
    setIsSyncing(true);
    try {
      const res = await syncFullGraph();
      showToast?.(res.data.message || 'Graph synchronized successfully!', 'success');
      fetchGraph();
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecuteCypher = async (e) => {
    e?.preventDefault();
    if (!cypherQuery.trim()) return;

    setRunningCypher(true);
    try {
      const res = await executeCypherQuery(cypherQuery);
      setCypherResults(res.data);
      showToast?.(`Cypher returned ${res.data.count} record(s).`, 'success');
    } catch (err) {
      showToast?.(err.response?.data?.message || err.message, 'error');
      setCypherResults({ error: err.response?.data?.message || err.message });
    } finally {
      setRunningCypher(false);
    }
  };

  // Node Dragging on SVG
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
  };

  const handleMouseMove = (e) => {
    if (draggingNodeId) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: mouseX, y: mouseY },
      }));
    } else if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsDraggingCanvas(false);
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'graph-bg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Filter nodes & links
  const visibleNodes = graphData.nodes.filter((n) => {
    if (!filters[n.label]) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.name && n.name.toLowerCase().includes(q)) ||
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.isbn && n.isbn.toLowerCase().includes(q)) ||
      (n.memberId && n.memberId.toLowerCase().includes(q))
    );
  });

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

  const visibleLinks = graphData.links.filter((l) => {
    if (!filters[l.type]) return false;
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
  });

  // Color mapping
  const getNodeColor = (label) => {
    switch (label) {
      case 'Author':
        return '#6366f1'; // Indigo
      case 'Book':
        return '#f59e0b'; // Amber
      case 'Member':
        return '#10b981'; // Emerald
      default:
        return '#64748b';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Neo4j Graph Relationship Explorer</h2>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                source === 'NEO4J'
                  ? 'bg-sky-50 text-sky-900 border-sky-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {source === 'NEO4J' ? 'Live Neo4j Cypher Engine' : 'Projected Fallback (Neo4j Standby)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Relational topology mapping <code>{`(:Author)-[:WROTE]->(:Book)`}</code> and <code>{`(:Member)-[:BORROWED]->(:Book)`}</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConsole(!showConsole)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showConsole ? 'Hide Cypher Console' : 'Open Cypher Console'}</span>
          </button>
          {isLibrarian && (
            <button
              onClick={handleSyncGraph}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#0F2942] hover:bg-[#17395B] text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Neo4j Graph'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Neo4j Standby Notice when running in fallback */}
      {source !== 'NEO4J' && (
        <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-amber-600 rounded-md p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Neo4j Graph Engine is currently unreachable on Bolt URI</strong> — visualizing relationships directly from MongoDB.
            <span className="block text-[11px] text-slate-500 mt-0.5">
              Connect a free cloud <strong>Neo4j AuraDB</strong> instance or start a local Neo4j container in <code>server/.env</code> and click <strong>Sync Neo4j Graph</strong> to activate live Cypher execution.
            </span>
          </div>
        </div>
      )}

      {/* Optional Cypher Console */}
      {showConsole && (
        <div className="bg-slate-900 rounded-md border border-slate-800 p-5 text-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Terminal className="w-4 h-4" />
              <span>Neo4j Cypher Query Console</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Quick Presets:</span>
              <button
                onClick={() =>
                  setCypherQuery('MATCH (a:Author)-[r:WROTE]->(b:Book) RETURN a.name AS Author, b.title AS Book')
                }
                className="hover:text-indigo-300 underline cursor-pointer"
              >
                Authors & Books
              </button>
              •
              <button
                onClick={() =>
                  setCypherQuery('MATCH (m:Member)-[r:BORROWED]->(b:Book) RETURN m.name AS Member, b.title AS Book, r.status AS Status, r.dueDate AS DueDate')
                }
                className="hover:text-indigo-300 underline cursor-pointer"
              >
                Active Borrowings
              </button>
            </div>
          </div>

          <form onSubmit={handleExecuteCypher} className="space-y-3">
            <textarea
              rows="3"
              value={cypherQuery}
              onChange={(e) => setCypherQuery(e.target.value)}
              placeholder="Enter Cypher query, e.g.: MATCH (n) RETURN n LIMIT 25"
              className="w-full bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-700 rounded-lg p-3 focus:outline-indigo-500"
            ></textarea>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={runningCypher}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{runningCypher ? 'Executing...' : 'Run Cypher Query'}</span>
              </button>
            </div>
          </form>

          {/* Results Table */}
          {cypherResults && (
            <div className="mt-3 bg-slate-950 rounded-lg border border-slate-800 p-3 max-h-60 overflow-y-auto">
              {cypherResults.error ? (
                <div className="text-red-400 text-xs font-mono">Error: {cypherResults.error}</div>
              ) : cypherResults.records?.length === 0 ? (
                <div className="text-slate-400 text-xs">Query executed successfully. 0 records returned.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        {Object.keys(cypherResults.records[0] || {}).map((col) => (
                          <th key={col} className="p-2">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {cypherResults.records.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/60">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="p-2 text-slate-200">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter / Controls Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search nodes in graph..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-indigo-500"
          />
        </div>

        {/* Filter Checkboxes */}
        <div className="flex flex-wrap items-center gap-4 text-slate-700 font-medium">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"></span>
            <input
              type="checkbox"
              checked={filters.Author}
              onChange={(e) => setFilters({ ...filters, Author: e.target.checked })}
              className="rounded text-indigo-600"
            />
            <span>Authors</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            <input
              type="checkbox"
              checked={filters.Book}
              onChange={(e) => setFilters({ ...filters, Book: e.target.checked })}
              className="rounded text-amber-600"
            />
            <span>Books</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <input
              type="checkbox"
              checked={filters.Member}
              onChange={(e) => setFilters({ ...filters, Member: e.target.checked })}
              className="rounded text-emerald-600"
            />
            <span>Members</span>
          </label>

          <span className="h-4 w-px bg-slate-200"></span>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-500">
            <input
              type="checkbox"
              checked={filters.WROTE}
              onChange={(e) => setFilters({ ...filters, WROTE: e.target.checked })}
              className="rounded text-indigo-600"
            />
            <span>[:WROTE]</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-500">
            <input
              type="checkbox"
              checked={filters.BORROWED}
              onChange={(e) => setFilters({ ...filters, BORROWED: e.target.checked })}
              className="rounded text-red-500"
            />
            <span>[:BORROWED]</span>
          </label>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
            className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
            className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 transition cursor-pointer"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Canvas and Node Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive SVG Graph Canvas (3 cols) */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={handleCanvasMouseDown}
          className="lg:col-span-3 h-[560px] bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-inner"
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span>Loading graph topology...</span>
              </div>
            </div>
          ) : (
            <svg
              id="graph-bg"
              className="w-full h-full"
              style={{
                cursor: isDraggingCanvas ? 'grabbing' : 'grab',
              }}
            >
              <defs>
                {/* Arrowhead marker for WROTE */}
                <marker
                  id="arrow-wrote"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                </marker>
                {/* Arrowhead marker for BORROWED (ISSUED - red) */}
                <marker
                  id="arrow-borrowed-issued"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
                {/* Arrowhead marker for BORROWED (RETURNED - green) */}
                <marker
                  id="arrow-borrowed-returned"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Render Links / Relationships */}
                {visibleLinks.map((link, idx) => {
                  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                  const p1 = nodePositions[sourceId];
                  const p2 = nodePositions[targetId];
                  if (!p1 || !p2) return null;

                  const isBorrowed = link.type === 'BORROWED';
                  const markerId = !isBorrowed
                    ? 'url(#arrow-wrote)'
                    : link.status === 'RETURNED'
                    ? 'url(#arrow-borrowed-returned)'
                    : 'url(#arrow-borrowed-issued)';

                  const strokeColor = !isBorrowed
                    ? '#6366f1'
                    : link.status === 'RETURNED'
                    ? '#10b981'
                    : '#ef4444';

                  // Midpoint for label
                  const midX = (p1.x + p2.x) / 2;
                  const midY = (p1.y + p2.y) / 2;

                  return (
                    <g key={`link-${idx}`}>
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={strokeColor}
                        strokeWidth="1.8"
                        strokeDasharray={isBorrowed && link.status === 'ISSUED' ? '4 3' : undefined}
                        markerEnd={markerId}
                        opacity="0.8"
                      />
                      <text
                        x={midX}
                        y={midY - 4}
                        fill={strokeColor}
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none select-none font-semibold"
                      >
                        {link.type}
                        {link.status ? ` [${link.status}]` : ''}
                      </text>
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {visibleNodes.map((node) => {
                  const pos = nodePositions[node.id] || { x: 400, y: 250 };
                  const color = getNodeColor(node.label);
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <g
                      key={`node-${node.id}`}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer"
                    >
                      {/* Selection Glow */}
                      {isSelected && (
                        <circle
                          r="26"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeDasharray="3 3"
                          className="animate-spin"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r="18"
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition hover:scale-110"
                      />

                      {/* Node Label Text */}
                      <text
                        y="4"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {node.label[0]}
                      </text>

                      {/* Node Name Label Below */}
                      <text
                        y="32"
                        fill="#cbd5e1"
                        fontSize="11"
                        fontWeight="600"
                        textAnchor="middle"
                        className="pointer-events-none select-none drop-shadow-md"
                      >
                        {(node.name || node.title || '').length > 20
                          ? (node.name || node.title || '').slice(0, 18) + '...'
                          : node.name || node.title || ''}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Canvas Floating Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-xs border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span>Author Node</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span>
              <span>Book Node</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ml-2"></span>
              <span>Member Node</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Drag nodes to rearrange • Drag background to pan • Click node to inspect
            </div>
          </div>
        </div>

        {/* Node Properties Inspector (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Cypher Node Inspector</h3>
            </div>

            {!selectedNode ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Click on any node in the graph canvas to inspect its Neo4j properties and relationships.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Label
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full font-bold text-white text-xs`}
                    style={{ backgroundColor: getNodeColor(selectedNode.label) }}
                  >
                    :{selectedNode.label}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Name / Title
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedNode.title || selectedNode.name}
                  </div>
                </div>

                {selectedNode.isbn && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      ISBN
                    </span>
                    <span className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {selectedNode.isbn}
                    </span>
                  </div>
                )}

                {selectedNode.memberId && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Member ID
                    </span>
                    <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedNode.memberId}
                    </span>
                  </div>
                )}

                {selectedNode.category && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Category
                    </span>
                    <span className="text-slate-700">{selectedNode.category}</span>
                  </div>
                )}

                {selectedNode.country && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Country
                    </span>
                    <span className="text-slate-700">{selectedNode.country}</span>
                  </div>
                )}

                {selectedNode.availableCopies !== undefined && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Available Stock:</span>
                    <strong className="text-slate-900 text-sm">
                      {selectedNode.availableCopies} / {selectedNode.quantity} copies
                    </strong>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    MongoDB Reference ID
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 break-all">
                    {selectedNode.id}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            <strong>Graph Stats:</strong> {visibleNodes.length} nodes, {visibleLinks.length} relationships active.
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphExplorer;
