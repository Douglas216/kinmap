import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';
import 'reactflow/dist/style.css';
import familyData from './data/family.json';
import './App.css';

const ROOT_UNION_ID = 'u_jiangchun_chengrong';
const MATERNAL_UNION_ID = 'u_chengyongshan_duanzhengbi';
const ME_ID = 'p_jiangyida';
const BROTHER_ID = 'p_jiangsenda';

const UNION_SIZE = { width: 260, height: 52 };
const PERSON_SIZE = { width: 120, height: 40 };
const JUNCTION_SIZE = { width: 6, height: 6 };

const elk = new ELK();

function UnionNode({ data }) {
  return (
    <div className="union-node">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <span className={`union-name ${data.focusSide === 'left' ? 'active' : ''}`}>
        {data.leftName}
      </span>
      <button className="union-toggle" onClick={data.onToggle}>
        ⇄
      </button>
      <span className={`union-name ${data.focusSide === 'right' ? 'active' : ''}`}>
        {data.rightName}
      </span>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}

function PersonNode({ data }) {
  return (
    <button className="person-node" onClick={data.onSelect}>
      <Handle type="target" position={Position.Top} className="node-handle" />
      {data.name}
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </button>
  );
}

function JunctionNode({ data }) {
  const ports = data?.ports || [];
  return (
    <div className="junction-node">
      <Handle id="in" type="target" position={Position.Top} className="node-handle" />
      {ports.map((port) => (
        <Handle
          key={port.handleId}
          id={port.handleId}
          type="source"
          position={Position.Bottom}
          className="node-handle"
        />
      ))}
    </div>
  );
}

function sortSiblings(a, b) {
  const aDob = a.dob ? new Date(a.dob) : null;
  const bDob = b.dob ? new Date(b.dob) : null;
  if (aDob && bDob && aDob.getTime() !== bDob.getTime()) {
    return aDob - bDob;
  }
  if (a.birthOrder && b.birthOrder && a.birthOrder !== b.birthOrder) {
    return a.birthOrder - b.birthOrder;
  }
  return (a.names?.zh?.full || '').localeCompare(b.names?.zh?.full || '');
}

function buildVisibleGraph(rootUnionId, unionFocusSide, maps) {
  const {
    peopleById,
    unionsById,
    childrenByUnionId,
    parentUnionByChildId,
    onSelectPerson,
    onToggleUnion,
  } = maps;

  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeIds = new Set();

  const addUnionNode = (unionId) => {
    const union = unionsById.get(unionId);
    if (!union || nodeIds.has(unionId)) return;
    const left = peopleById.get(union.partnerLeftId);
    const right = peopleById.get(union.partnerRightId);
    nodes.push({
      id: union.id,
      type: 'unionNode',
      data: {
        leftName: left?.names?.zh?.full || union.partnerLeftId,
        rightName: right?.names?.zh?.full || union.partnerRightId,
        focusSide: unionFocusSide[union.id] || union.focusSide || 'left',
        onToggle: () => onToggleUnion(union.id),
      },
      style: { ...UNION_SIZE },
    });
    nodeIds.add(unionId);
  };

  const addPersonNode = (personId) => {
    const person = peopleById.get(personId);
    if (!person || nodeIds.has(personId)) return;
    nodes.push({
      id: person.id,
      type: 'personNode',
      data: {
        name: person.names?.zh?.full || person.id,
        onSelect: () => onSelectPerson(person.id),
      },
      style: { ...PERSON_SIZE },
    });
    nodeIds.add(personId);
  };

  const addJunctionNode = (junctionId, portCount) => {
    if (nodeIds.has(junctionId)) return;
    const ports = [
      { id: `${junctionId}:in`, handleId: 'in', side: 'NORTH' },
      ...Array.from({ length: portCount }, (_, idx) => ({
        id: `${junctionId}:out_${idx}`,
        handleId: `out_${idx}`,
        side: 'SOUTH',
      })),
    ];
    nodes.push({
      id: junctionId,
      type: 'junction',
      data: { ports },
      style: { ...JUNCTION_SIZE },
      ports,
    });
    nodeIds.add(junctionId);
  };

  const addEdge = (source, target, index, sourceHandle, targetHandle) => {
    const id = `e_${source}_${target}_${index}`;
    if (edgeIds.has(id)) return;
    edges.push({
      id,
      source,
      target,
      type: 'smoothstep',
      sourceHandle,
      targetHandle,
    });
    edgeIds.add(id);
  };

  const addChildrenEdges = (unionId, children) => {
    if (children.length === 0) return;
    if (children.length === 1) {
      const child = children[0];
      addPersonNode(child.id);
      addEdge(unionId, child.id, 0);
      return;
    }

    const junctionId = `j-${unionId}`;
    addJunctionNode(junctionId, children.length);
    addEdge(unionId, junctionId, 0, undefined, 'in');

    children.forEach((child, idx) => {
      addPersonNode(child.id);
      addEdge(junctionId, child.id, idx, `out_${idx}`);
    });
  };

  const rootUnion = unionsById.get(rootUnionId);
  if (!rootUnion) return { nodes, edges };
  addUnionNode(rootUnionId);

  const rawChildrenIds = childrenByUnionId.get(rootUnionId) || [];
  const sortedChildren = rawChildrenIds
    .map((id) => peopleById.get(id))
    .filter(Boolean)
    .sort(sortSiblings);
  const finalChildren =
    sortedChildren.length > 0
      ? sortedChildren
      : [ME_ID, BROTHER_ID]
          .map((id) => peopleById.get(id))
          .filter(Boolean)
          .sort(sortSiblings);

  addChildrenEdges(rootUnionId, finalChildren);

  const rootFocusSide = unionFocusSide[rootUnionId] || rootUnion.focusSide || 'left';
  const activeParentId =
    rootFocusSide === 'left' ? rootUnion.partnerLeftId : rootUnion.partnerRightId;

  const grandUnionId = parentUnionByChildId.get(activeParentId);
  if (grandUnionId) {
    addUnionNode(grandUnionId);
  }

  if (grandUnionId && rootFocusSide === 'right') {
    const grandChildren = (childrenByUnionId.get(grandUnionId) || [])
      .map((id) => peopleById.get(id))
      .filter(Boolean)
      .sort(sortSiblings);

    if (grandChildren.length > 0) {
      addChildrenEdges(grandUnionId, grandChildren);
    }
    addEdge(grandUnionId, rootUnionId, 0);

    if (grandUnionId === MATERNAL_UNION_ID) {
      grandChildren
        .filter((child) => child.id !== activeParentId)
        .forEach((sibling) => {
          const siblingUnion = Array.from(unionsById.values()).find(
            (union) =>
              union.id !== rootUnionId &&
              (union.partnerLeftId === sibling.id || union.partnerRightId === sibling.id)
          );
          if (!siblingUnion) return;
          addUnionNode(siblingUnion.id);
          addEdge(sibling.id, siblingUnion.id, 0);
          const cousinChildren = (childrenByUnionId.get(siblingUnion.id) || [])
            .map((id) => peopleById.get(id))
            .filter(Boolean)
            .sort(sortSiblings);
          addChildrenEdges(siblingUnion.id, cousinChildren);
        });
    }
  } else if (grandUnionId) {
    addEdge(grandUnionId, rootUnionId, 0);
  }

  const dedupedNodes = Array.from(new Map(nodes.map((node) => [node.id, node])).values());
  const dedupedEdges = Array.from(new Map(edges.map((edge) => [edge.id, edge])).values());

  return { nodes: dedupedNodes, edges: dedupedEdges };
}

async function layoutWithElk(nodes, edges) {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.portConstraints': 'FIXED_ORDER',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',
      'elk.layered.considerModelOrder': 'true',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.spacing.edgeNodeBetweenLayers': '50',
      'elk.spacing.edgeEdge': '20',
    },
    children: nodes.map((node) => {
      const ports = node.ports || node.data?.ports;
      return {
        id: node.id,
        width: node.style?.width || PERSON_SIZE.width,
        height: node.style?.height || PERSON_SIZE.height,
        ports: ports?.map((port) => ({
          id: port.id,
          properties: {
            'elk.port.side': port.side,
          },
        })),
      };
    }),
    edges: edges.map((edge) => {
      const sourcePort = edge.sourceHandle
        ? `${edge.source}:${edge.sourceHandle}`
        : edge.source;
      const targetPort = edge.targetHandle
        ? `${edge.target}:${edge.targetHandle}`
        : edge.target;
      return {
        id: edge.id,
        sources: [sourcePort],
        targets: [targetPort],
      };
    }),
  };

  const layout = await elk.layout(graph);
  const nodePositions = new Map();
  layout.children?.forEach((child) => {
    nodePositions.set(child.id, { x: child.x || 0, y: child.y || 0 });
  });

  return {
    nodes: nodes.map((node) => ({
      ...node,
      position: nodePositions.get(node.id) || { x: 0, y: 0 },
    })),
    edges,
  };
}

export default function App() {
  const peopleById = useMemo(
    () => new Map(familyData.people.map((person) => [person.id, person])),
    []
  );
  const unionsById = useMemo(
    () => new Map(familyData.unions.map((union) => [union.id, union])),
    []
  );
  const childrenByUnionId = useMemo(() => {
    const map = new Map();
    familyData.childOf.forEach((link) => {
      if (!map.has(link.unionId)) map.set(link.unionId, []);
      map.get(link.unionId).push(link.childId);
    });
    return map;
  }, []);
  const parentUnionByChildId = useMemo(() => {
    const map = new Map();
    familyData.childOf.forEach((link) => {
      map.set(link.childId, link.unionId);
    });
    return map;
  }, []);

  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [unionFocusSide, setUnionFocusSide] = useState(() =>
    familyData.unions.reduce((acc, union) => {
      acc[union.id] = union.focusSide || 'left';
      return acc;
    }, {})
  );

  const handleToggleUnion = (unionId) => {
    setUnionFocusSide((prev) => ({
      ...prev,
      [unionId]: prev[unionId] === 'left' ? 'right' : 'left',
    }));
  };

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () =>
      buildVisibleGraph(ROOT_UNION_ID, unionFocusSide, {
        peopleById,
        unionsById,
        childrenByUnionId,
        parentUnionByChildId,
        onSelectPerson: setSelectedPersonId,
        onToggleUnion: handleToggleUnion,
      }),
    [unionFocusSide, peopleById, unionsById, childrenByUnionId, parentUnionByChildId]
  );

  const [layoutedNodes, setLayoutedNodes] = useState([]);
  const [layoutedEdges, setLayoutedEdges] = useState([]);

  useEffect(() => {
    let active = true;
    layoutWithElk(rawNodes, rawEdges).then((result) => {
      if (!active) return;
      setLayoutedNodes(result.nodes);
      setLayoutedEdges(result.edges);
    });
    return () => {
      active = false;
    };
  }, [rawNodes, rawEdges]);

  const selectedPerson = selectedPersonId ? peopleById.get(selectedPersonId) : null;

  return (
    <div className="family-page">
      <div className={`canvas-shell ${selectedPerson ? 'with-panel' : ''}`}>
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          nodeTypes={{ unionNode: UnionNode, personNode: PersonNode, junction: JunctionNode }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background gap={16} color="#d8c9b3" />
          <Controls />
        </ReactFlow>
      </div>

      {selectedPerson && (
        <aside className="profile-panel">
          <div className="panel-header">
            <h2>{selectedPerson.names?.zh?.full || '人物档案'}</h2>
            <button className="close-btn" onClick={() => setSelectedPersonId(null)}>
              ×
            </button>
          </div>
          <div className="panel-body">
            <p>
              <span className="label">英文名</span>
              {selectedPerson.names?.en
                ? `${selectedPerson.names.en.first} ${selectedPerson.names.en.last}`.trim()
                : '—'}
            </p>
            <p>
              <span className="label">出生日期</span>
              {selectedPerson.dob || '—'}
            </p>
            <p>
              <span className="label">所在地</span>
              {selectedPerson.location || '—'}
            </p>
            <p>
              <span className="label">昵称</span>
              {selectedPerson.nicknames?.length ? selectedPerson.nicknames.join('、') : '—'}
            </p>
            <p>
              <span className="label">备注</span>
              {selectedPerson.notes || '—'}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
