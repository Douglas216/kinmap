import { useMemo, useState } from 'react';
import './App.css';

const relationColors = {
  father: '#2ad7a0',
  mother: '#2ad7a0',
  husband: '#f78f3f',
  wife: '#f78f3f',
  brother: '#4ba3ff',
  sister: '#4ba3ff',
  sibling: '#4ba3ff',
  child: '#c5d86d',
  cousin: '#c86df7',
  uncle: '#6dd3f7',
  aunt: '#f0c36c',
  grandparent: '#8aa0ff',
  default: '#ffffff',
};

const initialMembers = [
  {
    id: 'me',
    nameCn: '江道格',
    nameEn: 'Douglas Jiang',
    relation: 'me',
    nickname: 'Doug',
    location: 'Seattle, USA',
    notes: 'Collects family stories and photos.',
    x: 50,
    y: 68,
  },
  {
    id: 'father',
    nameCn: '江海',
    nameEn: 'Hai Jiang',
    relation: 'father',
    nickname: 'Uncle Hai',
    location: 'Nanjing, China',
    notes: 'Engineer; loves calligraphy.',
    x: 38,
    y: 42,
  },
  {
    id: 'mother',
    nameCn: '李青',
    nameEn: 'Qing Li',
    relation: 'mother',
    nickname: 'Aunt Qing',
    location: 'Nanjing, China',
    notes: 'Keeps the family recipes.',
    x: 62,
    y: 42,
  },
  {
    id: 'sister',
    nameCn: '江安娜',
    nameEn: 'Anna Jiang',
    relation: 'sister',
    nickname: 'AnAn',
    location: 'Vancouver, Canada',
    notes: 'Design student who documents family history.',
    x: 50,
    y: 52,
  },
  {
    id: 'spouse',
    nameCn: '林晓',
    nameEn: 'Xiao Lin',
    relation: 'wife',
    nickname: 'Lin',
    location: 'Seattle, USA',
    notes: 'Introduced to family in 2020.',
    x: 30,
    y: 68,
  },
  {
    id: 'p-grandpa',
    nameCn: '江德成',
    nameEn: 'Decheng Jiang',
    relation: 'grandfather (paternal)',
    nickname: 'Lao Ye',
    location: 'Yangzhou, China',
    notes: 'Kept the first written family tree.',
    x: 30,
    y: 20,
  },
  {
    id: 'p-grandma',
    nameCn: '孙敏',
    nameEn: 'Min Sun',
    relation: 'grandmother (paternal)',
    nickname: 'Nai Nai',
    location: 'Yangzhou, China',
    notes: 'Taught calligraphy to the cousins.',
    x: 42,
    y: 20,
  },
  {
    id: 'm-grandpa',
    nameCn: '李盛',
    nameEn: 'Sheng Li',
    relation: 'grandfather (maternal)',
    nickname: 'Gong Gong',
    location: 'Chengdu, China',
    notes: 'Keeps photo albums from the 60s.',
    x: 58,
    y: 20,
  },
  {
    id: 'm-grandma',
    nameCn: '周蕊',
    nameEn: 'Rui Zhou',
    relation: 'grandmother (maternal)',
    nickname: 'Po Po',
    location: 'Chengdu, China',
    notes: 'Knows everyone’s childhood nicknames.',
    x: 70,
    y: 20,
  },
  {
    id: 'p-uncle',
    nameCn: '江山',
    nameEn: 'Shan Jiang',
    relation: 'uncle (paternal)',
    nickname: 'Shan',
    location: 'Shanghai, China',
    notes: 'Family storyteller and archivist.',
    x: 28,
    y: 48,
  },
  {
    id: 'cousin',
    nameCn: '江悦',
    nameEn: 'Yue Jiang',
    relation: 'cousin',
    nickname: 'Yuyu',
    location: 'Shanghai, China',
    notes: 'Started interviewing elders in 2023.',
    x: 20,
    y: 58,
  },
];

const initialConnections = [
  { id: 'me-father', from: 'me', to: 'father', type: 'child' },
  { id: 'me-mother', from: 'me', to: 'mother', type: 'child' },
  { id: 'me-sister', from: 'me', to: 'sister', type: 'sibling' },
  { id: 'me-spouse', from: 'me', to: 'spouse', type: 'husband' },
  { id: 'father-p-grandpa', from: 'father', to: 'p-grandpa', type: 'child' },
  { id: 'father-p-grandma', from: 'father', to: 'p-grandma', type: 'child' },
  { id: 'mother-m-grandpa', from: 'mother', to: 'm-grandpa', type: 'child' },
  { id: 'mother-m-grandma', from: 'mother', to: 'm-grandma', type: 'child' },
  { id: 'p-uncle-p-grandpa', from: 'p-uncle', to: 'p-grandpa', type: 'child' },
  { id: 'p-uncle-p-grandma', from: 'p-uncle', to: 'p-grandma', type: 'child' },
  { id: 'p-uncle-cousin', from: 'p-uncle', to: 'cousin', type: 'father' },
  { id: 'father-p-uncle', from: 'father', to: 'p-uncle', type: 'brother' },
];

function RelationChip({ label, type }) {
  return (
    <span
      className="relation-chip"
      style={{ borderColor: relationColors[type] || relationColors.default }}
    >
      <span
        className="relation-dot"
        style={{ background: relationColors[type] || relationColors.default }}
      />
      {label}
    </span>
  );
}

function MemberCard({ member, selected, onSelect }) {
  return (
    <div
      className={`node-card ${selected ? 'active' : ''}`}
      style={{ left: `${member.x}%`, top: `${member.y}%` }}
      onClick={() => onSelect(member.id)}
    >
      <div className="node-name-cn">{member.nameCn}</div>
      <div className="node-relation">{member.relation}</div>
      <div className="node-name-en">{member.nameEn}</div>
    </div>
  );
}

function App() {
  const [members, setMembers] = useState(initialMembers);
  const [connections, setConnections] = useState(initialConnections);
  const [selectedId, setSelectedId] = useState('me');
  const [draft, setDraft] = useState({
    nameCn: '',
    nameEn: '',
    relation: 'sister',
    nickname: '',
    location: '',
    notes: '',
    connectTo: 'me',
  });

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedId),
    [members, selectedId]
  );

  const stats = useMemo(() => {
    const locations = new Set();
    members.forEach((m) => {
      if (m.location) locations.add(m.location);
    });
    return { people: members.length, locations: locations.size };
  }, [members]);

  const handleAddRelative = (event) => {
    event.preventDefault();
    if (!draft.nameCn.trim()) return;

    const id = `member-${Date.now()}`;
    const newMember = {
      id,
      nameCn: draft.nameCn,
      nameEn: draft.nameEn,
      relation: draft.relation,
      nickname: draft.nickname,
      location: draft.location,
      notes: draft.notes,
      x: 10 + Math.random() * 80,
      y: 18 + Math.random() * 70,
    };

    const newConnection = {
      id: `${id}-${draft.connectTo}`,
      from: id,
      to: draft.connectTo,
      type: draft.relation,
    };

    setMembers((prev) => [...prev, newMember]);
    setConnections((prev) => [...prev, newConnection]);
    setSelectedId(id);
    setDraft({
      nameCn: '',
      nameEn: '',
      relation: 'sister',
      nickname: '',
      location: '',
      notes: '',
      connectTo: 'me',
    });
  };

  const renderLine = (line) => {
    const from = members.find((m) => m.id === line.from);
    const to = members.find((m) => m.id === line.to);
    if (!from || !to) return null;
    const active = selectedId === line.from || selectedId === line.to;
    const color = relationColors[line.type] || relationColors.default;

    return (
      <line
        key={line.id}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        className={`map-line ${active ? 'active' : ''}`}
      />
    );
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">KinMap</p>
          <h1>Know every connection in your family network.</h1>
          <p className="lede">
            Nodes show Chinese names. Open a profile to reveal English names,
            nicknames, current location, and remarks.
          </p>
          <div className="hero-actions">
            <button className="cta" onClick={() => setSelectedId('me')}>
              Center on me
            </button>
            <RelationChip label="Father / Mother" type="father" />
            <RelationChip label="Brother / Sister" type="sibling" />
            <RelationChip label="Spouse" type="wife" />
          </div>
        </div>
        <div className="hero-card">
          <div className="stat">
            <div className="stat-number">{stats.people}</div>
            <div className="stat-label">People mapped</div>
          </div>
          <div className="stat">
            <div className="stat-number">{stats.locations}</div>
            <div className="stat-label">Locations tracked</div>
          </div>
          <p className="stat-footnote">
            Add names as you go. Relationships are simplified to father, mother,
            husband, wife, brother, sister.
          </p>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Network map</p>
              <h2>Family graph</h2>
            </div>
            <button className="ghost" onClick={() => setSelectedId('me')}>
              Focus on me
            </button>
          </div>

          <div className="map-shell">
            <svg viewBox="0 0 100 100" className="map-lines">
              {connections.map((line) => renderLine(line))}
            </svg>
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                selected={selectedId === member.id}
                onSelect={setSelectedId}
              />
            ))}
          </div>

          <div className="legend">
            <RelationChip label="Parent" type="father" />
            <RelationChip label="Sibling" type="sibling" />
            <RelationChip label="Spouse" type="wife" />
            <RelationChip label="Cousin" type="cousin" />
            <RelationChip label="Grandparent" type="grandparent" />
          </div>
        </section>

        <aside className="panel detail">
          {selectedMember ? (
            <>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Profile</p>
                  <h2>{selectedMember.nameCn}</h2>
                  <p className="subhead">{selectedMember.relation}</p>
                </div>
                <RelationChip label="Selected" type={selectedMember.relation} />
              </div>
              <div className="detail-body">
                <dl>
                  <dt>English name</dt>
                  <dd>{selectedMember.nameEn || '—'}</dd>
                  <dt>Nickname</dt>
                  <dd>{selectedMember.nickname || '—'}</dd>
                  <dt>Current location</dt>
                  <dd>{selectedMember.location || '—'}</dd>
                  <dt>Notes</dt>
                  <dd>{selectedMember.notes || '—'}</dd>
                </dl>
              </div>
            </>
          ) : (
            <p>Select a person to see details.</p>
          )}
          <div className="divider" />
          <form className="add-form" onSubmit={handleAddRelative}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Add relative</p>
                <h3>Extend the tree</h3>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Chinese name
                <input
                  required
                  value={draft.nameCn}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, nameCn: e.target.value }))
                  }
                  placeholder="e.g., 江小龙"
                />
              </label>
              <label>
                English name
                <input
                  value={draft.nameEn}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, nameEn: e.target.value }))
                  }
                  placeholder="e.g., Xiaolong Jiang"
                />
              </label>
              <label>
                Relationship type
                <select
                  value={draft.relation}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, relation: e.target.value }))
                  }
                >
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="husband">Husband</option>
                  <option value="wife">Wife</option>
                  <option value="brother">Brother</option>
                  <option value="sister">Sister</option>
                  <option value="child">Child</option>
                  <option value="cousin">Cousin</option>
                  <option value="uncle">Uncle</option>
                  <option value="aunt">Aunt</option>
                  <option value="grandparent">Grandparent</option>
                </select>
              </label>
              <label>
                Connect to
                <select
                  value={draft.connectTo}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, connectTo: e.target.value }))
                  }
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameCn} — {m.relation}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nickname
                <input
                  value={draft.nickname}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, nickname: e.target.value }))
                  }
                  placeholder="Family nickname"
                />
              </label>
              <label>
                Location
                <input
                  value={draft.location}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, location: e.target.value }))
                  }
                  placeholder="City, Country"
                />
              </label>
              <label className="full">
                Notes
                <textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  placeholder="Add remarks, how you met, anecdotes..."
                />
              </label>
            </div>
            <button type="submit" className="cta full-width">
              Add to KinMap
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}

export default App;
