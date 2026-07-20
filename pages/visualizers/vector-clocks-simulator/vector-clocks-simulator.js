/**
 * vector-clocks-simulator.js
 * Simulate Vector Clocks and Causality between 3 nodes.
 * eslint-disable no-unused-vars
 */
/* eslint-disable no-unused-vars */

document.addEventListener('DOMContentLoaded', () => {
  initSVG();
});

const nodes = {
  A: {
    index: 0,
    clock: [0, 0, 0],
    events: [],
    timelineEl: document.getElementById('timeline-A'),
    vectorEl: document.querySelector('#node-A .current-vector'),
  },
  B: {
    index: 1,
    clock: [0, 0, 0],
    events: [],
    timelineEl: document.getElementById('timeline-B'),
    vectorEl: document.querySelector('#node-B .current-vector'),
  },
  C: {
    index: 2,
    clock: [0, 0, 0],
    events: [],
    timelineEl: document.getElementById('timeline-C'),
    vectorEl: document.querySelector('#node-C .current-vector'),
  },
};

let eventCounter = 0;
const allEvents = [];
let pendingSendFrom = null;

// Causality Analyzer State
let selectedEvents = [];

const els = {
  svg: document.getElementById('arrowsSvg'),
  modal: document.getElementById('receiverModal'),
  senderLabel: document.getElementById('senderNodeLabel'),
  receiverButtons: document.getElementById('receiverButtons'),
  analyzerResult: document.getElementById('analyzerResult'),
  box1: document.getElementById('selectedEvent1'),
  box2: document.getElementById('selectedEvent2'),
};

function initSVG() {
  // Add arrowhead marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.7)" />
        </marker>`;
  els.svg.appendChild(defs);

  // Handle window resize to redraw arrows
  window.addEventListener('resize', drawAllArrows);
}

function updateVectorUI(nodeId) {
  const node = nodes[nodeId];
  node.vectorEl.textContent = `[${node.clock.join(', ')}]`;
}

function createEventDot(nodeId, vector, type) {
  eventCounter++;
  const node = nodes[nodeId];

  const dot = document.createElement('div');
  dot.className = 'event-dot';
  dot.style.top = `${eventCounter * 40}px`;

  const label = document.createElement('div');
  label.className = 'event-label';
  label.textContent = `[${vector.join(',')}]`;
  dot.appendChild(label);

  node.timelineEl.appendChild(dot);

  const eventObj = {
    id: `e${eventCounter}`,
    nodeId: nodeId,
    vector: [...vector],
    dotEl: dot,
    type: type, // 'internal', 'send', 'receive'
  };

  node.events.push(eventObj);
  allEvents.push(eventObj);

  dot.addEventListener('click', () => selectForAnalyzer(eventObj));

  return eventObj;
}

function triggerInternal(nodeId) {
  const node = nodes[nodeId];
  node.clock[node.index]++;
  updateVectorUI(nodeId);
  createEventDot(nodeId, node.clock, 'internal');
}

function startSend(nodeId) {
  pendingSendFrom = nodeId;
  els.senderLabel.textContent = nodeId;

  els.receiverButtons.innerHTML = '';
  ['A', 'B', 'C'].forEach((target) => {
    if (target !== nodeId) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.background = `var(--color-node-${target})`;
      btn.textContent = `To ${target}`;
      btn.onclick = () => finishSend(target);
      els.receiverButtons.appendChild(btn);
    }
  });

  els.modal.classList.remove('hidden');
}

function cancelSend() {
  pendingSendFrom = null;
  els.modal.classList.add('hidden');
}

function finishSend(targetId) {
  const senderId = pendingSendFrom;
  cancelSend();

  // 1. Sender ticks and creates send event
  nodes[senderId].clock[nodes[senderId].index]++;
  updateVectorUI(senderId);
  const sendEvent = createEventDot(senderId, nodes[senderId].clock, 'send');

  // 2. Receiver ticks, merges clock, creates receive event
  // Math.max for each element
  const receiver = nodes[targetId];
  receiver.clock[receiver.index]++;
  for (let i = 0; i < 3; i++) {
    if (i !== receiver.index) {
      receiver.clock[i] = Math.max(receiver.clock[i], nodes[senderId].clock[i]);
    }
  }
  updateVectorUI(targetId);
  const receiveEvent = createEventDot(targetId, receiver.clock, 'receive');

  // 3. Draw Arrow
  sendEvent.targetEvent = receiveEvent;
  drawAllArrows();
}

function drawAllArrows() {
  // Clear existing arrows (except defs)
  els.svg.innerHTML = '';
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.7)" />
        </marker>`;
  els.svg.appendChild(defs);

  const svgRect = els.svg.getBoundingClientRect();

  allEvents.forEach((ev) => {
    if (ev.type === 'send' && ev.targetEvent) {
      const r1 = ev.dotEl.getBoundingClientRect();
      const r2 = ev.targetEvent.dotEl.getBoundingClientRect();

      const x1 = r1.left + r1.width / 2 - svgRect.left;
      const y1 = r1.top + r1.height / 2 - svgRect.top;
      const x2 = r2.left + r2.width / 2 - svgRect.left;
      const y2 = r2.top + r2.height / 2 - svgRect.top;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('class', 'message-arrow');
      els.svg.appendChild(line);
    }
  });
}

// Causality Analyzer
function selectForAnalyzer(eventObj) {
  // Toggle off if already selected
  const idx = selectedEvents.findIndex((e) => e.id === eventObj.id);
  if (idx > -1) {
    selectedEvents.splice(idx, 1);
    eventObj.dotEl.classList.remove('selected');
    updateAnalyzerUI();
    return;
  }

  // Add to selection (max 2)
  if (selectedEvents.length >= 2) {
    const removed = selectedEvents.shift();
    removed.dotEl.classList.remove('selected');
  }

  selectedEvents.push(eventObj);
  eventObj.dotEl.classList.add('selected');
  updateAnalyzerUI();
}

function updateAnalyzerUI() {
  if (selectedEvents.length === 0) {
    els.box1.querySelector('.value').textContent = '--';
    els.box2.querySelector('.value').textContent = '--';
    els.analyzerResult.textContent = 'Waiting for selection...';
    els.analyzerResult.className = 'result-box';
  } else if (selectedEvents.length === 1) {
    els.box1.querySelector('.value').textContent = `[${selectedEvents[0].vector.join(',')}]`;
    els.box2.querySelector('.value').textContent = '--';
    els.analyzerResult.textContent = 'Select a second event...';
    els.analyzerResult.className = 'result-box';
  } else if (selectedEvents.length === 2) {
    const v1 = selectedEvents[0].vector;
    const v2 = selectedEvents[1].vector;

    els.box1.querySelector('.value').textContent = `[${v1.join(',')}]`;
    els.box2.querySelector('.value').textContent = `[${v2.join(',')}]`;

    // Compare logic
    // v1 <= v2 iff for all i, v1[i] <= v2[i]
    // v1 < v2 iff v1 <= v2 and v1 != v2
    const v1_less_v2 = compareVectors(v1, v2);
    const v2_less_v1 = compareVectors(v2, v1);

    if (v1_less_v2) {
      els.analyzerResult.textContent = 'Event 1 Happened-Before Event 2 (→)';
      els.analyzerResult.className = 'result-box happened-before';
    } else if (v2_less_v1) {
      els.analyzerResult.textContent = 'Event 2 Happened-Before Event 1 (←)';
      els.analyzerResult.className = 'result-box happened-before';
    } else {
      els.analyzerResult.textContent = 'Events are Concurrent (||)';
      els.analyzerResult.className = 'result-box concurrent';
    }
  }
}

function compareVectors(v1, v2) {
  let strictLess = false;
  for (let i = 0; i < 3; i++) {
    if (v1[i] > v2[i]) return false; // not <=
    if (v1[i] < v2[i]) strictLess = true;
  }
  return strictLess;
}

function resetAll() {
  ['A', 'B', 'C'].forEach((id) => {
    nodes[id].clock = [0, 0, 0];
    nodes[id].events = [];
    nodes[id].timelineEl.innerHTML = '';
    updateVectorUI(id);
  });
  eventCounter = 0;
  allEvents.length = 0;
  selectedEvents = [];
  drawAllArrows();
  updateAnalyzerUI();
}
