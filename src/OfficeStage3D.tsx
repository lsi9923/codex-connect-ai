import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AGENTS, AgentId, SPECIALIST_IDS } from './agents';
import { OfficePlan } from './simulator';

type AgentSceneItem = {
  id: AgentId;
  group: THREE.Group;
  home: THREE.Vector3;
  desk: THREE.Mesh;
  statusLight: THREE.Mesh;
  feet: THREE.Mesh[];
  facingYaw: number;
};

type OfficeStageOpsSettings = {
  autoCycleEnabled: boolean;
  dailyBriefingTime: string;
  secretaryBridgeMode: string;
  autoGitSyncApproval: boolean;
  dynamicModelDetection: boolean;
};

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

function worldFromDesk(id: AgentId) {
  const desk = AGENTS[id].desk;
  return new THREE.Vector3((desk.x - 50) * 0.18, 0, (desk.y - 50) * 0.13);
}

function yawToward(from: THREE.Vector3, to: THREE.Vector3) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

function setFacingYaw(item: AgentSceneItem, target: THREE.Vector3) {
  item.facingYaw = yawToward(item.group.position, target);
  item.group.rotation.y = item.facingYaw;
}

function material(color: string, roughness = 0.64) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.08,
  });
}

function makeBlockAgent(agentId: AgentId) {
  const agent = AGENTS[agentId];
  const color = agent.color === '#F8FAFC' ? '#93c5fd' : agent.color;
  const group = new THREE.Group();
  group.name = agentId;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.34), material(color, 0.52));
  body.position.y = 0.82;
  group.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.37), material('#0f172a', 0.5));
  chest.position.set(0, 0.94, 0.02);
  group.add(chest);

  const profileScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.21),
    new THREE.MeshBasicMaterial({ map: makeAgentCardTexture(agentId), transparent: true, toneMapped: false }),
  );
  profileScreen.position.set(0, 0.95, 0.208);
  group.add(profileScreen);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.46), material('#f8d7b1', 0.62));
  head.position.y = 1.43;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 0.49), material('#111827', 0.7));
  hair.position.y = 1.7;
  group.add(hair);

  const eyeMaterial = material('#020617', 0.5);
  const eyeA = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.022), eyeMaterial);
  eyeA.position.set(-0.1, 1.47, 0.24);
  const eyeB = eyeA.clone();
  eyeB.position.x = 0.1;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.035), material('#efb98e', 0.58));
  nose.position.set(0, 1.405, 0.255);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.024), material('#7f1d1d', 0.55));
  mouth.position.set(0, 1.34, 0.254);
  group.add(eyeA, eyeB, nose, mouth);

  const armMaterial = material(color, 0.55);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), armMaterial);
  leftArm.position.set(-0.34, 0.82, 0);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.34;
  group.add(leftArm, rightArm);

  const feet = [-0.16, 0.16].map((x) => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.38), material('#1e293b', 0.7));
    foot.position.set(x, 0.24, 0.08);
    group.add(foot);
    return foot;
  });

  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), material('#22c55e', 0.42));
  badge.position.set(0.24, 1.2, 0.22);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8), material('#94a3b8', 0.38));
  antenna.position.set(0.22, 1.9, -0.02);
  const antennaLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 12),
    new THREE.MeshBasicMaterial({ color: '#86efac' }),
  );
  antennaLight.position.set(0.22, 2.08, -0.02);
  group.add(badge, antenna, antennaLight);

  return { group, feet, badge };
}

function makeDesk(agentId: AgentId) {
  const agent = AGENTS[agentId];
  const color = agent.color === '#F8FAFC' ? '#60a5fa' : agent.color;
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 0.72), material('#334155', 0.58));
  top.position.y = 0.28;
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.06), material('#0ea5e9', 0.35));
  screen.position.set(0, 0.62, -0.24);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.05), material(color, 0.36));
  glow.position.set(0, 0.72, -0.2);
  group.add(top, screen, glow);
  return group;
}

function makeLabelTexture(text: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(2, 6, 23, .78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  ctx.fillStyle = '#e5eefc';
  ctx.font = 'bold 30px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 58);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeAgentCardTexture(agentId: AgentId) {
  const agent = AGENTS[agentId];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 160);
  gradient.addColorStop(0, '#020617');
  gradient.addColorStop(0.52, agent.color === '#F8FAFC' ? '#1d4ed8' : agent.color);
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(0, 0, canvas.width, 42);
  ctx.strokeStyle = 'rgba(255,255,255,.36)';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = '#e5eefc';
  ctx.font = 'bold 56px Segoe UI Emoji, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(agent.emoji, 22, 112);
  ctx.font = 'bold 28px Segoe UI, sans-serif';
  ctx.fillText(agent.name, 96, 80);
  ctx.font = '15px Segoe UI, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(agent.role.slice(0, 22), 96, 108);
  ctx.fillStyle = '#bbf7d0';
  ctx.font = 'bold 13px Segoe UI, sans-serif';
  ctx.fillText('profile screen linked', 96, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSystemTower(label: string, color: string) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.22, 18), material('#111827', 0.48));
  base.position.y = 0.16;
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.86, 0.44), material(color, 0.36));
  core.position.y = 0.72;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.12, 0.52),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62 }),
  );
  glass.position.y = 1.22;
  const pulse = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.018, 8, 36),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.76 }),
  );
  pulse.rotation.x = Math.PI / 2;
  pulse.position.y = 1.04;
  const labelTexture = makeLabelTexture(label, color);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, transparent: true, opacity: 0.9 }));
  sprite.scale.set(1.1, 0.42, 1);
  sprite.position.y = 1.7;
  group.add(base, core, glass, pulse, sprite);
  group.name = `system-${label.toLowerCase()}`;
  return { group, pulse, core };
}

function setupScene(container: HTMLDivElement) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#0b1220', 12, 28);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 9.5, 12.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight('#cbd5e1', 1.2);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(2, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const cyan = new THREE.PointLight('#22d3ee', 55, 16);
  cyan.position.set(0, 3.5, 0);
  const warm = new THREE.PointLight('#f59e0b', 26, 12);
  warm.position.set(-4, 4, 5);
  scene.add(ambient, key, cyan, warm);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.18, 13), material('#5b3a22', 0.78));
  floor.position.y = -0.09;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(18, 18, '#38bdf8', '#475569');
  grid.position.y = 0.012;
  grid.material.opacity = 0.28;
  grid.material.transparent = true;
  scene.add(grid);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 4.2, 0.22), material('#1e293b', 0.7));
  backWall.position.set(0, 2.05, -6.55);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 13), material('#111827', 0.74));
  leftWall.position.set(-9.1, 1.55, 0);
  const rightWall = leftWall.clone();
  rightWall.position.x = 9.1;
  scene.add(backWall, leftWall, rightWall);

  const windowMaterial = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.32 });
  [-5.4, -3.8, 3.8, 5.4].forEach((x) => {
    const officeWindow = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.35, 0.035), windowMaterial);
    officeWindow.position.set(x, 2.45, -6.42);
    scene.add(officeWindow);
  });

  const signTexture = makeLabelTexture('24H OPS CTRL', '#86efac');
  const opsSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture, transparent: true, opacity: 0.94 }));
  opsSign.scale.set(2.1, 0.78, 1);
  opsSign.position.set(0, 3.3, -6.28);
  scene.add(opsSign);

  [-4.5, 0, 4.5].forEach((x, idx) => {
    const lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.045, 0.08),
      new THREE.MeshBasicMaterial({ color: idx === 1 ? '#86efac' : '#7dd3fc', transparent: true, opacity: 0.78 }),
    );
    lightBar.position.set(x, 3.95, -2.4 + idx * 1.4);
    scene.add(lightBar);
  });

  const ceoTable = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.42, 32), material('#1d4ed8', 0.48));
  ceoTable.position.set(0, 0.34, 0);
  ceoTable.castShadow = true;
  scene.add(ceoTable);

  const ceoHalo = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.035, 10, 72),
    new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.78 }),
  );
  ceoHalo.rotation.x = Math.PI / 2;
  ceoHalo.position.y = 0.62;
  scene.add(ceoHalo);

  const routeLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.9 }),
  );
  routeLine.position.y = 0.08;
  scene.add(routeLine);

  const movingPacket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28), material('#22d3ee', 0.38));
  movingPacket.position.y = 0.32;
  scene.add(movingPacket);

  const learningRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.05, 0.028, 10, 96),
    new THREE.MeshBasicMaterial({ color: '#a7f3d0', transparent: true, opacity: 0.58 }),
  );
  learningRing.rotation.x = Math.PI / 2;
  learningRing.position.y = 0.18;
  scene.add(learningRing);

  const systemSpecs = [
    { label: 'MEMORY', color: '#86efac', angle: -0.82 },
    { label: 'SKILLS', color: '#f0abfc', angle: -2.26 },
    { label: 'GATEWAY', color: '#7dd3fc', angle: 0.82 },
    { label: 'CRON', color: '#fde68a', angle: 2.26 },
  ];
  const systemTowers = systemSpecs.map((spec) => {
    const tower = makeSystemTower(spec.label, spec.color);
    tower.group.position.set(Math.cos(spec.angle) * 3.05, 0, Math.sin(spec.angle) * 2.25 + 0.28);
    tower.group.rotation.y = -spec.angle + Math.PI;
    scene.add(tower.group);
    return tower;
  });

  return { scene, camera, renderer, ceoHalo, routeLine, movingPacket, learningRing, systemTowers };
}

export function OfficeStage3D({
  plan,
  activeAgent,
  selectAgent,
  opsSettings,
}: {
  plan: OfficePlan;
  activeAgent: AgentId;
  selectAgent: (id: AgentId) => void;
  opsSettings: OfficeStageOpsSettings;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const planRef = useRef(plan);
  const activeAgentRef = useRef(activeAgent);
  const selectAgentRef = useRef(selectAgent);
  const opsSettingsRef = useRef(opsSettings);

  useEffect(() => {
    planRef.current = plan;
    activeAgentRef.current = activeAgent;
    selectAgentRef.current = selectAgent;
    opsSettingsRef.current = opsSettings;
  }, [activeAgent, opsSettings, plan, selectAgent]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const { scene, camera, renderer, ceoHalo, routeLine, movingPacket, learningRing, systemTowers } = setupScene(container);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const agents = new Map<AgentId, AgentSceneItem>();
    let simTime = 0;
    let frameId = 0;
    let lastFrame = performance.now();

    SPECIALIST_IDS.forEach((id) => {
      const home = worldFromDesk(id);
      const deskGroup = makeDesk(id);
      deskGroup.position.copy(home);
      deskGroup.rotation.y = yawToward(home, new THREE.Vector3(0, 0, 0));
      scene.add(deskGroup);

      const deskMesh = deskGroup.children[0] as THREE.Mesh;
      const { group, feet, badge } = makeBlockAgent(id);
      group.position.set(home.x, 0, home.z + 0.78);
      const facingYaw = yawToward(group.position, new THREE.Vector3(0, 0, 0));
      group.rotation.y = facingYaw;
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = true;
      });
      scene.add(group);

      const labelTexture = makeLabelTexture(AGENTS[id].name, AGENTS[id].color);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, transparent: true }));
      label.scale.set(1.35, 0.5, 1);
      label.position.set(0, 2.15, 0);
      group.add(label);

      agents.set(id, { id, group, home: group.position.clone(), desk: deskMesh, statusLight: badge, feet, facingYaw });
    });

    const ceoAgent = makeBlockAgent('ceo');
    ceoAgent.group.position.set(0, 0, -0.2);
    ceoAgent.group.scale.setScalar(1.18);
    scene.add(ceoAgent.group);

    const resize = () => {
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 500;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const computeRoute = (time: number) => {
      const roster = planRef.current.activeAgents.length ? planRef.current.activeAgents : SPECIALIST_IDS;
      const cycle = 6.4;
      const index = Math.floor(time / cycle) % roster.length;
      const agentId = roster[index];
      const phaseTime = (time % cycle) / cycle;
      return { roster, agentId, phaseTime, index };
    };

    const updateScene = (time: number) => {
      const { agentId, phaseTime } = computeRoute(time);
      const current = agents.get(agentId);
      const ceoPoint = new THREE.Vector3(0, 0, 1.15);

      ceoHalo.rotation.z = time * 0.9;
      learningRing.rotation.z = -time * 0.36;
      systemTowers.forEach((tower, idx) => {
        tower.group.position.y = Math.sin(time * 1.7 + idx) * 0.055;
        tower.pulse.rotation.z = time * (1.1 + idx * 0.12);
        tower.pulse.scale.setScalar(1 + Math.sin(time * 2.4 + idx) * 0.08);
        tower.core.rotation.y = time * 0.32 + idx * 0.6;
      });
      ceoAgent.group.position.y = Math.sin(time * 2.5) * 0.04;
      ceoAgent.feet.forEach((foot, idx) => {
        foot.rotation.x = Math.sin(time * 4 + idx * Math.PI) * 0.18;
      });

      agents.forEach((item, id) => {
        const task = planRef.current.tasks.find((candidate) => candidate.agent === id);
        const home = item.home;
        const idleBob = Math.sin(time * 2.2 + home.x) * 0.045;
        item.group.position.set(home.x, idleBob, home.z);
        setFacingYaw(item, ceoPoint);
        item.group.scale.setScalar(id === activeAgentRef.current ? 1.13 : 1);
        item.statusLight.scale.setScalar(task?.status === 'approval' ? 1.55 : task?.status === 'running' ? 1.25 : 1);
        const lampMaterial = item.statusLight.material as THREE.MeshStandardMaterial;
        lampMaterial.color.set(task?.status === 'approval' ? '#f59e0b' : task?.status === 'done' ? '#86efac' : '#22c55e');
        item.feet.forEach((foot, idx) => {
          foot.rotation.x = Math.sin(time * 5 + idx * Math.PI) * 0.18;
        });
      });

      if (current) {
        const start = current.home.clone();
        const go = Math.min(1, phaseTime / 0.38);
        const back = phaseTime > 0.68 ? Math.min(1, (phaseTime - 0.68) / 0.32) : 0;
        const hold = phaseTime >= 0.38 && phaseTime <= 0.68;
        const easedGo = 1 - Math.pow(1 - go, 3);
        const easedBack = back * back * (3 - 2 * back);
        const routePoint = hold
          ? ceoPoint
          : phaseTime < 0.68
            ? start.clone().lerp(ceoPoint, easedGo)
            : ceoPoint.clone().lerp(start, easedBack);
        routePoint.y = Math.sin(time * 11) * 0.05;
        current.group.position.copy(routePoint);
        current.group.scale.setScalar(1.22);
        setFacingYaw(current, phaseTime < 0.68 ? ceoPoint : start);
        current.feet.forEach((foot, idx) => {
          foot.rotation.x = Math.sin(time * 14 + idx * Math.PI) * 0.5;
        });

        const activeLine = [start.clone().setY(0.1), ceoPoint.clone().setY(0.1)];
        routeLine.geometry.setFromPoints(activeLine);
        const packetRatio = phaseTime < 0.5 ? phaseTime * 2 : (1 - phaseTime) * 2;
        movingPacket.position.copy(start.clone().lerp(ceoPoint, Math.max(0, Math.min(1, packetRatio))));
        movingPacket.position.y = 0.45 + Math.sin(time * 8) * 0.08;
        movingPacket.rotation.set(time * 1.4, time * 2.2, time * 1.1);
      }

      camera.position.x = Math.sin(time * 0.11) * 0.45;
      camera.position.z = 12.3 + Math.cos(time * 0.1) * 0.25;
      camera.lookAt(0, 0.4, 0);
    };

    const renderGameToText = () => {
      const route = computeRoute(simTime);
      const activeItem = agents.get(route.agentId);
      const currentOps = opsSettingsRef.current;
      const payload = {
        mode: 'three-office-lego-stage',
        coordinateSystem: 'x left/right, z depth, y height',
        activeAgent: route.agentId,
        activeAgentPosition: activeItem
          ? {
              x: Number(activeItem.group.position.x.toFixed(2)),
              y: Number(activeItem.group.position.y.toFixed(2)),
              z: Number(activeItem.group.position.z.toFixed(2)),
            }
          : null,
        facingYaw: activeItem ? Number(activeItem.facingYaw.toFixed(3)) : null,
        movingAgents: Array.from(agents.values()).map((item) => ({
          id: item.id,
          x: Number(item.group.position.x.toFixed(2)),
          z: Number(item.group.position.z.toFixed(2)),
          facingYaw: Number(item.facingYaw.toFixed(3)),
        })),
        runId: planRef.current.runId,
        taskCount: planRef.current.tasks.length,
        autoCycle: {
          enabled: currentOps.autoCycleEnabled,
          label: currentOps.autoCycleEnabled ? '24시간 업무 실행 중' : '24시간 업무 대기',
          setting: 'connectAiLab.autoCycleEnabled',
          dailyBriefingTime: currentOps.dailyBriefingTime,
          secretaryBridgeMode: currentOps.secretaryBridgeMode,
          autoGitSync: currentOps.autoGitSyncApproval ? 'approval-gated' : 'manual-off',
          dynamicModelDetection: currentOps.dynamicModelDetection,
        },
        hermesSystems: ['memory', 'skill-forge', 'gateway', 'scheduler'],
        sourceRepos: ['https://github.com/lsi9923/connect-ai', 'https://github.com/fathah/hermes-desktop'],
        orientation: {
          localForward: '+Z',
          method: 'manual-yaw',
          activeAgentDoesNotUseLookAt: true,
        },
      };
      return JSON.stringify(payload);
    };

    const render = () => {
      updateScene(simTime);
      renderer.render(scene, camera);
    };

    const animate = () => {
      const now = performance.now();
      simTime += Math.min(0.04, (now - lastFrame) / 1000);
      lastFrame = now;
      render();
      frameId = window.requestAnimationFrame(animate);
    };

    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const roots = Array.from(agents.values()).map((item) => item.group);
      const hits = raycaster.intersectObjects(roots, true);
      const hitRoot = hits[0]?.object;
      if (!hitRoot) return;
      let current: THREE.Object3D | null = hitRoot;
      while (current && !agents.has(current.name as AgentId)) current = current.parent;
      if (current) selectAgentRef.current(current.name as AgentId);
    };

    window.render_game_to_text = renderGameToText;
    window.advanceTime = (ms: number) => {
      simTime += Math.max(0, ms) / 1000;
      render();
    };

    resize();
    render();
    animate();
    window.addEventListener('resize', resize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      if (window.render_game_to_text === renderGameToText) delete window.render_game_to_text;
      delete window.advanceTime;
      renderer.dispose();
      container.replaceChildren();
    };
  }, []);

  return <div className="three-office-stage" ref={containerRef} aria-label="3D AI employee office stage" />;
}
