import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { textureUrls } from './solar-assets';
import { orbitPosition, ORBIT_ELEMENTS } from './solar-orbits';
import { geographicPosition, indonesiaDaylight } from './solar-daylight';
import { mountControlIcons, replaceIconText, setSolarIcon } from './solar-icons';

export function mountSolarSimulator() {
  mountControlIcons();
  const listeners = [];
  function listen(target, event, handler) { if (!target) return; target.addEventListener(event, handler); listeners.push(() => target.removeEventListener(event, handler)); }
  const loader = new THREE.TextureLoader();
  const textures = Object.fromEntries(Object.entries(textureUrls).map(([name, url]) => {
    const texture = loader.load(url);
    texture.encoding = name === 'clouds' ? THREE.LinearEncoding : THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return [name, texture];
  }));

    /* --- AUDIO SYNTHESIS DENGAN WEB AUDIO API (RESPON TAKTIL PID) --- */
    let audioCtx = null;
    function playChime(freq = 440, type = 'sine', duration = 0.12) {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {
        // Fallback senyap jika audio diblokir kebijakan browser
      }
    }

    /* --- GENERATOR TEKSTUR REALISTIS PROSEDURAL (100% BEBAS ASSET EKSTERNAL) --- */
    const RealisticTextureLab = {
      // 1. TEKSTUR BINTANG KOSMIK DENGAN NEBULA
      createDeepSpace() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, 1024, 1024);

        // Awan nebula redup
        for (let i = 0; i < 6; i++) {
          const gx = Math.random() * 1024;
          const gy = Math.random() * 1024;
          const rad = 150 + Math.random() * 250;
          const grad = ctx.createRadialGradient(gx, gy, 10, gx, gy, rad);
          const col = (i % 2 === 0) ? 'rgba(30, 58, 138, 0.12)' : 'rgba(88, 28, 135, 0.1)';
          grad.addColorStop(0, col);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(gx, gy, rad, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ribuan bintang dengan ragam magnitudo dan warna (putih, biru, keemasan)
        for (let i = 0; i < 1200; i++) {
          const x = Math.random() * 1024;
          const y = Math.random() * 1024;
          const r = Math.random() < 0.95 ? (Math.random() * 1.2) : (1.5 + Math.random() * 1.5);
          const alpha = 0.2 + Math.random() * 0.8;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          const tint = Math.random();
          if (tint > 0.85) ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
          else if (tint > 0.7) ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
          else ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
        return new THREE.CanvasTexture(canvas);
      },

      createEarthRealistic() { return textures.earth; },
      createEarthClouds() { return textures.clouds; },
      createMoonRealistic() { return textures.moon; },
      createSunRealistic() { return textures.sun; },
      createGasGiant(baseColor) { return baseColor === '#c9905c' ? textures.jupiter : textures.saturn; },

      // Cincin Saturnus dengan Celah Cassini (Cassini Division) Nyata
      createSaturnRings() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const cx = 256, cy = 256;

        ctx.clearRect(0, 0, 512, 512);

      // Sapuan Cincin C, B, Celah Cassini, dan Cincin A
        for (let r = 90; r < 240; r++) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);

          // Celah Cassini kosong di r = 180 s.d 192
          if (r >= 180 && r <= 192) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
          } else {
            const alpha = 0.35 + 0.45 * Math.sin(r * 0.18);
            ctx.strokeStyle = `rgba(224, 198, 145, ${alpha})`;
          }
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        return new THREE.CanvasTexture(canvas);
      }
    };

    /* --- INISIALISASI THREE.JS & SISTEM GRAFIS --- */
    const canvas = document.getElementById('webgl-canvas');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 18, 38);

    // OrbitControls Khusus Layar Sentuh PID
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.minDistance = 4;
    controls.maxDistance = 280;
    // Standar Sentuh: 1 Jari = Rotasi 360°, 2 Jari = Pinch Zoom & Pan Geser
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Pencahayaan Ruang Angkasa
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.38); // Sisi malam tetap terlihat nyaman di layar kelas
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
    sunLight.position.set(40, 4, 0);
    scene.add(sunLight);

    // Small sharp stars, rather than a magnified low-resolution sky map.
    const starPositions = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i++) {
      const y = Math.random() * 2 - 1;
      const angle = Math.random() * Math.PI * 2;
      const radial = Math.sqrt(1 - y * y);
      starPositions.set([radial * Math.cos(angle) * 650, y * 650, radial * Math.sin(angle) * 650], i * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc8d4e3, size: .75, transparent: true, opacity: .65, sizeAttenuation: false })));

    /* =========================================================================
       MODE 1: ROTASI BUMI (KEMIRINGAN 23.5°, SIANG-MALAM & DETEKTOR INDONESIA)
       ========================================================================= */
    const earthRotationGroup = new THREE.Group();
    scene.add(earthRotationGroup);

    // Sumbu Kemiringan Aksial Bumi Sejati 23.44° (~23.5°)
    const earthTiltGroup = new THREE.Group();
    earthTiltGroup.rotation.z = THREE.MathUtils.degToRad(23.44);
    earthRotationGroup.add(earthTiltGroup);

    // 1. Bola Bumi Utama (Sphere Geometry 64x64 untuk kelengkungan sempurna)
    const earthRadius = 6.2;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: RealisticTextureLab.createEarthRealistic(),
      roughness: 0.55,
      metalness: 0.0
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthTiltGroup.add(earthMesh);

    // 2. Lapisan Awan Atmosfer Terpisah (Berputar Sedikit Lebih Cepat dari Daratan)
    const cloudGeo = new THREE.SphereGeometry(earthRadius + 0.12, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      alphaMap: RealisticTextureLab.createEarthClouds(),
      color: 0xffffff,
      depthWrite: false,
      transparent: true,
      opacity: 0.70,
      blending: THREE.NormalBlending,
      roughness: 1.0
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthTiltGroup.add(cloudMesh);

    // 3. Garis Poros Putar Bumi (Kutub Utara ke Kutub Selatan)
    const axisGroup = new THREE.Group();
    const axisRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 18, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    axisGroup.add(axisRod);

    // Penanda Label Kutub Utara & Selatan
    const northPoleCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    northPoleCap.position.y = 9;
    axisGroup.add(northPoleCap);

    const southPoleCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    southPoleCap.position.y = -9;
    axisGroup.add(southPoleCap);

    // Garis Lingkar Khatulistiwa (Ekuator Bumi)
    const equatorRing = new THREE.Mesh(
      new THREE.RingGeometry(earthRadius + 0.02, earthRadius + 0.15, 64),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    equatorRing.rotation.x = Math.PI / 2;
    earthTiltGroup.add(equatorRing);
    earthTiltGroup.add(axisGroup);

    // 4. Indonesia, aligned to the Blue Marble texture's Greenwich meridian.
    const indoBeaconGroup = new THREE.Group();
    const pinDistance = earthRadius + 0.16;
    const pinPosition = geographicPosition(0.5, 118, pinDistance);
    const { x: pinX, y: pinY, z: pinZ } = pinPosition;
    indoBeaconGroup.position.copy(pinPosition);

    // Bentuk Pin Merah Putih Bercahaya
    const pinHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    const pinBase = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.8, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
    );
    pinBase.lookAt(pinX * 2, pinY * 2, pinZ * 2);
    indoBeaconGroup.add(pinHead);
    indoBeaconGroup.add(pinBase);
    earthMesh.add(indoBeaconGroup); // Berputar sinkron bersama daratan Bumi

    /* =========================================================================
       MODE 2: REVOLUSI BUMI (KEPLERIAN ELIPS, PERIHELION, AFELIUM & 4 MUSIM)
       ========================================================================= */
    const earthRevolutionGroup = new THREE.Group();
    earthRevolutionGroup.visible = false;
    scene.add(earthRevolutionGroup);

    // 1. Matahari Pusat Bersinar dengan Corona Pulsing
    const sunRevGeo = new THREE.SphereGeometry(5.2, 40, 40);
    const sunRevMat = new THREE.MeshBasicMaterial({ map: RealisticTextureLab.createSunRealistic() });
    const sunRevMesh = new THREE.Mesh(sunRevGeo, sunRevMat);
    earthRevolutionGroup.add(sunRevMesh);

    // Halo Corona Matahari
    const sunGlowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5.9, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      })
    );
    sunRevMesh.add(sunGlowMesh);

    // 2. Jalur Orbit Elips Revolusi Bumi
    // Semi-mayor axis a = 25, semi-minor axis b = 23 (Elips representatif berpusat di fokus matahari)
    const revOrbitA = 26;
    const revOrbitB = revOrbitA * Math.sqrt(1 - 0.0167 ** 2);
    const revFocusC = Math.sqrt(revOrbitA * revOrbitA - revOrbitB * revOrbitB); // Fokus Kepler ~11.1
    // Posisikan Matahari di titik fokus elips (0, 0, 0)
    const revOrbitCurve = new THREE.EllipseCurve(
      -revFocusC, 0, // Pusat kurva elips digeser agar matahari berada di fokus (0,0)
      revOrbitA, revOrbitB,
      0, 2 * Math.PI,
      false, 0
    );
    const revOrbitPoints = revOrbitCurve.getPoints(160);
    const revOrbitGeo = new THREE.BufferGeometry().setFromPoints(revOrbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const revOrbitLine = new THREE.Line(
      revOrbitGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, linewidth: 2 })
    );
    
    earthRevolutionGroup.add(revOrbitLine);

    // Bumi Pembawa Revolusi
    const revolvingEarthHolder = new THREE.Group();
    earthRevolutionGroup.add(revolvingEarthHolder);

    // Kemiringan Sumbu Bumi Konsisten ke Arah Ruang Angkasa (Polaris / Sumbu +Z)
    // Sumbu kemiringan TIDAK berputar mengikuti arah matahari, melainkan tetap stabil di ruang angkasa!
    const revEarthTilt = new THREE.Group();
    revEarthTilt.rotation.x = THREE.MathUtils.degToRad(23.44);
    revolvingEarthHolder.add(revEarthTilt);

    const revEarthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 48, 48),
      new THREE.MeshStandardMaterial({
        map: RealisticTextureLab.createEarthRealistic(),
        roughness: 0.6
      })
    );
    revEarthTilt.add(revEarthMesh);

    // Poros Bumi pada Revolusi
    const revAxis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 6.5, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    revEarthTilt.add(revAxis);

    // Titik Penanda 4 Posisi Kunci Musim & Perihelion / Aphelion
    const SEASON_STATIONS = [
      {
        id: 'june_solstice',
        name: "21 Juni (Solstis Musim Panas)",
        desc: "Kutub Utara condong maksimal ke Matahari. BBU mengalami siang terpanjang!",
        color: 0xef4444,
        t: 0.25, // Posisi sudut orbit
        icon: "☀️"
      },
      {
        id: 'sep_equinox',
        name: "23 September (Ekuinoks Musim Gugur)",
        desc: "Matahari tepat di atas khatulistiwa. Siang dan malam sama panjang (12 jam).",
        color: 0xf59e0b,
        t: 0.50,
        icon: "🍂"
      },
      {
        id: 'dec_solstice',
        name: "22 Desember (Solstis Musim Dingin)",
        desc: "Kutub Selatan condong ke Matahari. BBU mengalami malam terpanjang!",
        color: 0x3b82f6,
        t: 0.75,
        icon: "❄️"
      },
      {
        id: 'mar_equinox',
        name: "21 Maret (Ekuinoks Musim Semi)",
        desc: "Awal musim semi di BBU, siang dan malam kembali berimbang 12 jam.",
        color: 0x10b981,
        t: 0.0,
        icon: "🌸"
      }
    ];

    SEASON_STATIONS.forEach(s => {
      const pt = revOrbitCurve.getPoint(s.t);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 16, 16),
        new THREE.MeshBasicMaterial({ color: s.color })
      );
      marker.position.set(pt.x, 0, pt.y);
      earthRevolutionGroup.add(marker);
    });

    /* =========================================================================
       MODE 3: ROTASI BULAN (KAWAH REALISTIS, NEAR SIDE VS FAR SIDE)
       ========================================================================= */
    const moonRotationGroup = new THREE.Group();
    moonRotationGroup.visible = false;
    scene.add(moonRotationGroup);

    const soloMoonGeo = new THREE.SphereGeometry(6.0, 64, 64);
    const soloMoonMat = new THREE.MeshStandardMaterial({
      map: RealisticTextureLab.createMoonRealistic(),
      roughness: 0.88,
      metalness: 0.05
    });
    const soloMoonMesh = new THREE.Mesh(soloMoonGeo, soloMoonMat);
    moonRotationGroup.add(soloMoonMesh);

    // Label Penanda "Sisi Dekat" (Near Side - Menghadap Bumi)
    const nearSideMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.3, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    nearSideMarker.position.set(0, 0, 6.06);
    soloMoonMesh.add(nearSideMarker);

    /* =========================================================================
       MODE 4: REVOLUSI BULAN & 8 FASE BULAN (GERAK SINKRON SEJATI)
       ========================================================================= */
    const moonRevolutionGroup = new THREE.Group();
    moonRevolutionGroup.visible = false;
    scene.add(moonRevolutionGroup);

    // Bumi di Pusat Sistem Bumi-Bulan
    const centerEarthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 48, 48),
      new THREE.MeshStandardMaterial({
        map: RealisticTextureLab.createEarthRealistic(),
        roughness: 0.6
      })
    );
    moonRevolutionGroup.add(centerEarthMesh);

    // Lintasan Orbit Bulan (Kemiringan ~5.14° terhadap Ekliptika)
    const moonOrbitRadius = 15.5;
    const moonOrbitTiltGroup = new THREE.Group();
    moonOrbitTiltGroup.rotation.x = THREE.MathUtils.degToRad(5.14);
    moonRevolutionGroup.add(moonOrbitTiltGroup);

    const moonOrbitCurve = new THREE.EllipseCurve(0, 0, moonOrbitRadius, moonOrbitRadius, 0, 2 * Math.PI, false, 0);
    const moonOrbitPoints = moonOrbitCurve.getPoints(120);
    const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const moonOrbitLine = new THREE.Line(
      moonOrbitGeo,
      new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 })
    );
    
    moonOrbitTiltGroup.add(moonOrbitLine);

    // Pivot Bulan Mengitari Bumi
    const moonOrbitPivot = new THREE.Group();
    moonOrbitTiltGroup.add(moonOrbitPivot);

    const revMoonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 40, 40),
      new THREE.MeshStandardMaterial({
        map: RealisticTextureLab.createMoonRealistic(),
        roughness: 0.88
      })
    );
    revMoonMesh.position.set(moonOrbitRadius, 0, 0);
    moonOrbitPivot.add(revMoonMesh);

    // Indikator Titik Menghadap Bumi pada Bulan (Membuktikan Gerak Sinkron)
    const lockMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    lockMarker.position.set(-1.63, 0, 0); // Selalu menunjuk ke arah pusat Bumi
    revMoonMesh.add(lockMarker);

    /* =========================================================================
       MODE 5: TATA SURYA 8 PLANET (SKALA KEPLERIAN & TEKSTUR KHAS MASING-MASING)
       ========================================================================= */
    const solarSystemGroup = new THREE.Group();
    solarSystemGroup.visible = false;
    scene.add(solarSystemGroup);

    // Matahari Pusat Tata Surya
    const sunMainGeo = new THREE.SphereGeometry(7.5, 48, 48);
    const sunMainMat = new THREE.MeshBasicMaterial({ map: RealisticTextureLab.createSunRealistic() });
    const sunMainMesh = new THREE.Mesh(sunMainGeo, sunMainMat);
    sunMainMesh.userData = { id: 'sun', name: 'Matahari' };
    solarSystemGroup.add(sunMainMesh);

    // Cahaya Titik Pusat Matahari ke Segala Arah
    const solarSunLight = new THREE.PointLight(0xfff7ed, 2.4, 0, 0);
    scene.add(solarSunLight);
    solarSunLight.visible = false;

    // Konfigurasi 8 Planet dengan Kecepatan Keplerian Nyata (v proporsional 1 / akar jarak)
    const PLANETS_DATABASE = [
      {
        id: 'mercury',
        name: 'Merkurius',
        radius: 0.95,
        distance: 13,
        speed: 1.6,
        rotSpeed: 0.008,
        color: '#9ca3af',
        texture: null,
        desc: 'Planet terkecil dan terdekat dari Matahari. Permukaannya penuh kawah seperti Bulan dan tidak memiliki atmosfer tebal sehingga suhu siangnya 430°C dan malamnya -180°C.'
      },
      {
        id: 'venus',
        name: 'Venus',
        radius: 1.5,
        distance: 18.5,
        speed: 1.2,
        rotSpeed: -0.004, // Rotasi retrograde (berlawanan jarum jam)
        color: '#fde047',
        texture: null,
        desc: 'Planet terpanas di tata surya (~465°C) akibat efek rumah kaca ekstrem atmosfer karbon dioksida pekat. Disebut Bintang Kejora dan berotasi terbalik dari timur ke barat.'
      },
      {
        id: 'earth',
        name: 'Bumi',
        radius: 1.65,
        distance: 25,
        speed: 1.0,
        rotSpeed: 0.025,
        color: null,
        texture: RealisticTextureLab.createEarthRealistic(),
        desc: 'Rumah kehidupan kita. Satu-satunya planet dengan air cair melimpah, atmosfer oksigen pelindung, dan satu satelit alami setia (Bulan).'
      },
      {
        id: 'mars',
        name: 'Mars',
        radius: 1.15,
        distance: 31.5,
        speed: 0.82,
        rotSpeed: 0.024,
        color: '#ef4444',
        texture: null,
        desc: 'Planet Merah berdebu karat besi oksida. Memiliki gunung berapi terbesar Olympus Mons dan tudung es kutub dari air beku serta karbon dioksida.'
      },
      {
        id: 'jupiter',
        name: 'Yupiter',
        radius: 3.8,
        distance: 43,
        speed: 0.44,
        rotSpeed: 0.045,
        color: null,
        texture: RealisticTextureLab.createGasGiant('#c9905c', [
          { y: 35, height: 26, color: '#8c5332' },
          { y: 85, height: 38, color: '#a6724b' },
          { y: 155, height: 32, color: '#7a4224' }
        ]),
        desc: 'Raksasa gas terbesar di tata surya. Memiliki pusaran badai Bintik Merah Raksasa (Great Red Spot) yang lebih besar dari Bumi dan lebih dari 90 satelit.'
      },
      {
        id: 'saturn',
        name: 'Saturnus',
        radius: 3.1,
        distance: 55,
        speed: 0.32,
        rotSpeed: 0.04,
        hasRings: true,
        color: null,
        texture: RealisticTextureLab.createGasGiant('#e8cf99', [
          { y: 55, height: 22, color: '#c7a76d' },
          { y: 110, height: 30, color: '#ab884c' }
        ]),
        desc: 'Planet paling memukau dengan cincin raksasa partikel es dan batu. Terdiri dari gas ringan hidrogen-helium sehingga secara teori massa jenisnya bisa mengapung di air!'
      },
      {
        id: 'uranus',
        name: 'Uranus',
        radius: 2.1,
        distance: 66,
        speed: 0.23,
        rotSpeed: 0.02,
        color: '#67e8f9',
        texture: null,
        tiltZ: 97.8, // Poros menggelinding
        desc: 'Raksasa es berwarna toska muda akibat gas metana. Sumbu rotasinya sangat miring 98 derajat sehingga berputar menggelinding mengitari Matahari!'
      },
      {
        id: 'neptune',
        name: 'Neptunus',
        radius: 2.0,
        distance: 76,
        speed: 0.18,
        rotSpeed: 0.022,
        color: '#2563eb',
        texture: null,
        desc: 'Planet terjauh dengan warna biru kobalt pekat. Merupakan tempat terdingin dengan angin badai supersonik terdahsyat di tata surya mencapai 2.100 km/jam.'
      }
    ];

    PLANETS_DATABASE.forEach((data, i) => {
      Object.assign(data, ORBIT_ELEMENTS[i]);
      data.texture = textures[data.id];
      data.color = null;
    });
    const solarPlanets = [];
    const solarOrbitLines = [];


    PLANETS_DATABASE.forEach(data => {
      // Garis Lintasan Orbit Halus Bercahaya
      const pts = Array.from({length: 241}, (_, i) => orbitPosition(data.distance, data.eccentricity, i / 240 * Math.PI * 2, data.inclination));
      const oGeo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, p.z)));
      const oMat = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.45 });
      const oLine = new THREE.Line(oGeo, oMat);
      
      solarSystemGroup.add(oLine);
      solarOrbitLines.push(oLine);

      // Pivot Rotasi Orbit
      const pivot = new THREE.Group();
      solarSystemGroup.add(pivot);

      // Material Bola Planet
      let pMat;
      if (data.texture) {
        pMat = new THREE.MeshStandardMaterial({ map: data.texture, roughness: 0.6 });
      } else {
        pMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(data.color), roughness: 0.7 });
      }

      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 64, 40), pMat);
      pMesh.position.set(data.distance, 0, 0);
      if (data.tiltZ) pMesh.rotation.z = THREE.MathUtils.degToRad(data.tiltZ);
      pMesh.userData = { id: data.id, name: data.name, config: data };
      const tiltHolder = new THREE.Group();
      tiltHolder.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
      pivot.add(tiltHolder);
      pMesh.position.set(0, 0, 0);
      pMesh.rotation.z = 0;
      tiltHolder.add(pMesh);

      // Cincin Megah untuk Saturnus
      if (data.hasRings) {
        const ringGeo = new THREE.RingGeometry(data.radius * 1.35, data.radius * 2.45, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          map: RealisticTextureLab.createSaturnRings(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        tiltHolder.add(ringMesh);
      }

      solarPlanets.push({
        config: data,
        pivot: pivot,
        holder: tiltHolder,
        mesh: pMesh,
        angle: (solarPlanets.length * 1.1 + 0.4) % (Math.PI * 2)
      });
    });

    /* --- STATE MANAGEMENT & KURIKULUM MERDEKA IPAS FASE C --- */
    const appState = {
      currentMode: 'earth_rotation',
      isPlaying: true,
      timeSpeed: 1.0,
      currentPlanetFocus: null
    };

    const EDUCATIONAL_MODULES = {
      earth_rotation: {
        title: "Rotasi Bumi",
        icon: "🌍",
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-blue-900/35 border border-blue-500/30 rounded-xl">
              <span class="text-xs font-bold text-sky-300 uppercase block mb-1">Konsep Inti Sains</span>
              <p><strong>Rotasi Bumi</strong> adalah perputaran Bumi pada porosnya dari arah <strong>barat ke timur</strong> dengan kemiringan sumbu <strong>23,5°</strong>.</p>
            </div>
            
            <div>
              <h4 class="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span>⏱️</span> Durasi Kala Rotasi (24 Jam)
              </h4>
              <p>Bumi berputar satu putaran penuh 360° memerlukan waktu <strong>23 jam 56 menit 4 detik</strong> (digenapkan menjadi <strong>24 jam / 1 hari</strong>).</p>
            </div>

            <div>
              <h4 class="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                <span>🌓</span> Akibat Rotasi Bumi:
              </h4>
              <ul class="list-disc pl-4 space-y-1 text-slate-300">
                <li><strong>Pergantian Siang & Malam:</strong> Daerah yang menghadap Matahari mengalami siang, sisi bayangan mengalami malam.</li>
                <li><strong>Gerak Semu Harian Matahari:</strong> Matahari seolah terbit di timur dan tenggelam di barat.</li>
                <li><strong>Perbedaan Zona Waktu:</strong> Pembagian waktu dunia (WIB, WITA, WIT di Indonesia).</li>
              </ul>
            </div>

            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span class="text-xs font-bold text-amber-300 block mb-1">Amati Wilayah Indonesia:</span>
              <p class="text-xs text-amber-100">Lihat pin merah-kuning pada bola dunia! Saat pin melintasi zona terang, Indonesia sedang siang; saat berputar ke sisi bayangan, malam tiba.</p>
            </div>
          </div>
        `,
        hint: "Gunakan 1 jari untuk memutar Bumi secara bebas. Amati batas siang-malam (garis terminator) yang melintasi kepulauan Indonesia!"
      },
      earth_revolution: {
        title: "Revolusi Bumi & 4 Musim",
        icon: "☀️",
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-amber-900/35 border border-amber-500/30 rounded-xl">
              <span class="text-xs font-bold text-amber-300 uppercase block mb-1">Hukum Sains Kepler</span>
              <p><strong>Revolusi Bumi</strong> adalah gerakan Bumi mengelilingi Matahari pada lintasan elips dengan Matahari berada di salah satu titik fokusnya.</p>
            </div>
            
            <div>
              <h4 class="font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                <span>📅</span> Durasi Kala Revolusi (1 Tahun)
              </h4>
              <p>Bumi memerlukan <strong>365 ¼ hari (365,25 hari)</strong> untuk satu putaran penuh. Sisa ¼ hari ini dikumpulkan menjadi 1 hari tambahan setiap 4 tahun sekali pada tanggal 29 Februari (<strong>Tahun Kabisat</strong>).</p>
            </div>

            <div>
              <h4 class="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                <span>🍂</span> Mengapa Terjadi Pergantian Musim?
              </h4>
              <p class="text-slate-300">Karena <strong>poros kemiringan 23,5° selalu menunjuk arah tetap di langit</strong> (ke arah bintang Polaris), sehingga secara bergantian Belahan Bumi Utara (BBU) dan Selatan (BBS) condong ke arah Matahari!</p>
            </div>

            <div class="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-1 text-xs">
              <span class="text-sky-300 font-bold block">4 Titik Kunci Musim:</span>
              <p>• <strong>21 Juni (Solstis):</strong> BBU Musim Panas (siang panjang), BBS Dingin.</p>
              <p>• <strong>23 September (Ekuinoks):</strong> BBU Gugur, BBS Semi (siang = malam 12 jam).</p>
              <p>• <strong>22 Desember (Solstis):</strong> BBU Musim Dingin, BBS Panas.</p>
              <p>• <strong>21 Maret (Ekuinoks):</strong> BBU Semi, BBS Gugur.</p>
            </div>
          </div>
        `,
        hint: "Perhatikan arah kemiringan poros Bumi yang tetap stabil ke satu arah ruang angkasa saat mengitari Matahari."
      },
      moon_rotation: {
        title: "Rotasi Bulan",
        icon: "🌕",
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-slate-800 border border-slate-600 rounded-xl">
              <span class="text-xs font-bold text-slate-300 uppercase block mb-1">Karakteristik Satelit Alami</span>
              <p><strong>Bulan</strong> adalah satelit alami Bumi yang tidak memiliki cahaya sendiri melainkan memantulkan sinar Matahari.</p>
            </div>

            <div>
              <h4 class="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span>⏱️</span> Kala Rotasi Bulan
              </h4>
              <p>Bulan membutuhkan waktu <strong>27,3 hari</strong> untuk berputar satu kali pada porosnya sendiri.</p>
            </div>

            <div>
              <h4 class="font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                <span>☄️</span> Mengapa Penuh Kawah?
              </h4>
              <p class="text-slate-300">Bulan tidak memiliki lapisan atmosfer pelindung. Meteorit jatuh leluasa menabrak permukaannya, membentuk kawah-kawah raksasa seperti kawah <strong>Tycho</strong> dan dataran lava gelap (<strong>Maria</strong>).</p>
            </div>

            <div class="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <span class="text-xs font-bold text-indigo-300 block mb-1">Gravitasi Bulan:</span>
              <p class="text-xs text-indigo-100">Gravitasi Bulan hanya <strong>⅙ (seperenam)</strong> dari gravitasi Bumi. Jika beratmu di Bumi 36 kg, di Bulan kamu melayang ringan seolah berbobot 6 kg!</p>
            </div>
          </div>
        `,
        hint: "Putar Bulan untuk mengamati kawah Tycho yang memancarkan garis-garis putih panjang ke segala penjuru dataran tinggi Bulan."
      },
      moon_revolution: {
        title: "Revolusi Bulan & 8 Fase",
        icon: "🌓",
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-indigo-900/35 border border-indigo-500/30 rounded-xl">
              <span class="text-xs font-bold text-indigo-300 uppercase block mb-1">Rahasia Wajah Bulan</span>
              <p>Waktu revolusi Bulan mengitari Bumi <strong>sama persis</strong> dengan waktu rotasinya (<strong>27,3 hari</strong>). Peristiwa ini disebut <strong>Gerak Sinkron (Tidal Locking)</strong>!</p>
            </div>

            <div>
              <h4 class="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span>👀</span> Mengapa Wajah Bulan Selalu Sama?
              </h4>
              <p class="text-slate-300">Karena kecepatan berputar pada porosnya seirama dengan kecepatan mengitari Bumi, maka <strong>sisi Bulan yang menghadap Bumi selalu sisi yang sama</strong> (Near Side)! Manusia di Bumi tidak pernah melihat sisi belakang Bulan secara langsung.</p>
            </div>

            <div>
              <h4 class="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                <span>🌗</span> Pengaruh Revolusi Bulan:
              </h4>
              <ul class="list-disc pl-4 space-y-1 text-slate-300">
                <li><strong>8 Fase Bulan:</strong> Bentuk tampak terang bulan berubah seiring posisinya terhadap Bumi dan Matahari.</li>
                <li><strong>Pasang Surut Air Laut:</strong> Tarikan gravitasi Bulan menciptakan pasang naik dan surut laut harian.</li>
                <li><strong>Gerhana:</strong> Terjadinya Gerhana Bulan dan Matahari ketika bidang orbit berpotongan sejajar.</li>
              </ul>
            </div>
          </div>
        `,
        hint: "Perhatikan kotak 'Fase dari Pandangan Bumi' di kiri atas. Bentuk bulan berubah otomatis mengikuti sudut revolusinya terhadap berkas sinar matahari!"
      },
      solar_system: {
        title: "Sistem Tata Surya",
        icon: "🌌",
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-purple-900/35 border border-purple-500/30 rounded-xl">
              <span class="text-xs font-bold text-purple-300 uppercase block mb-1">Keluarga Matahari</span>
              <p>Ukuran dan jarak pada tampilan diperbesar atau dipadatkan untuk pembelajaran. Tata Surya tersusun atas <strong>Matahari</strong> sebagai pusat gravitasi dan <strong>8 planet</strong> yang beredar mengelilinginya dalam satu bidang orbit.</p>
            </div>

            <div>
              <h4 class="font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                <span>🪐</span> Pengelompokan 8 Planet:
              </h4>
              <ul class="space-y-1.5 text-slate-300 text-xs">
                <li>• <strong>Planet Dalam (Terestrial/Batuan):</strong> Merkurius, Venus, Bumi, Mars (padat, berbatu, tanpa cincin, satelit sedikit).</li>
                <li>• <strong>Planet Luar (Jovian/Raksasa Gas & Es):</strong> Yupiter, Saturnus, Uranus, Neptunus (berukuran raksasa, memiliki cincin dan banyak satelit).</li>
              </ul>
            </div>

            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
              <span class="text-amber-300 font-bold block mb-1">🚀 Cara Interaksi Siswa:</span>
              <p class="text-amber-100">Sentuh langsung planet mana saja di layar 3D atau pilih tombol di bilah atas untuk memperbesar kamera langsung ke planet tersebut!</p>
            </div>
          </div>
        `,
        hint: "Ketuk salah satu planet pada layar sentuh PID untuk terbang mendekat dan melihat kartu fakta sains uniknya!"
      }
    };

    /* --- PENGATUR MODE DAN UI INTERAKTIF --- */
    const panelTitle = document.getElementById('panel-title');
    const panelIcon = document.getElementById('panel-icon');
    const panelContent = document.getElementById('panel-content');
    const panelHint = document.getElementById('panel-interaction-hint');
    const badgeIndo = document.getElementById('badge-indonesia');
    const badgeIndoStatus = document.getElementById('badge-indo-status');
    const badgeIndoDetail = document.getElementById('badge-indo-detail');
    const badgeIndoIcon = document.getElementById('badge-indo-icon');
    const badgeMoon = document.getElementById('badge-moon-phase');
    const badgeSeason = document.getElementById('badge-season');
    const planetBar = document.getElementById('planet-bar');
    const infoDrawer = document.getElementById('info-drawer');

    function updateEducationPanel(modeKey) {
      const data = EDUCATIONAL_MODULES[modeKey];
      if (!data) return;
      panelTitle.textContent = data.title;
      panelIcon.innerHTML = replaceIconText(data.icon);
      panelContent.innerHTML = replaceIconText(data.content);
      panelHint.innerHTML = replaceIconText(`<strong>Aksi Sentuh PID:</strong> ${data.hint}`);
    }

    function switchMode(newMode) {
      playChime(520, 'sine', 0.15);
      appState.currentMode = newMode;
      appState.currentPlanetFocus = null;

      // Update Nav Tabs Active State
      document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.dataset.mode === newMode) {
          tab.classList.add('active', 'bg-blue-600', 'text-white', 'shadow');
          tab.classList.remove('text-slate-300');
        } else {
          tab.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow');
          tab.classList.add('text-slate-300');
        }
      });

      // Tampilkan / Sembunyikan Grup 3D Sesuai Mode
      earthRotationGroup.visible = (newMode === 'earth_rotation');
      earthRevolutionGroup.visible = (newMode === 'earth_revolution');
      moonRotationGroup.visible = (newMode === 'moon_rotation');
      moonRevolutionGroup.visible = (newMode === 'moon_revolution');
      solarSystemGroup.visible = (newMode === 'solar_system');

      // Tampilkan / Sembunyikan Badges Kontekstual
      badgeIndo.classList.toggle('hidden', newMode !== 'earth_rotation');
      badgeSeason.classList.toggle('hidden', newMode !== 'earth_revolution');
      badgeMoon.classList.toggle('hidden', newMode !== 'moon_revolution');
      planetBar.classList.toggle('hidden', newMode !== 'solar_system');
      if (newMode === 'moon_revolution') drawRealisticMoonPhase(moonRevAngle);

      sunLight.visible = !['earth_revolution', 'solar_system'].includes(newMode);
      solarSunLight.visible = !sunLight.visible;
      // Setup Posisi Kamera & Sumber Cahaya Matahari
      controls.target.set(0, 0, 0);
      if (newMode === 'earth_rotation') {
        sunLight.position.set(40, 3, 0);
        camera.position.set(0, 9, 23);
      } else if (newMode === 'earth_revolution') {
        sunLight.position.set(0, 0, 0);
        camera.position.set(0, 42, 45);
      } else if (newMode === 'moon_rotation') {
        sunLight.position.set(30, 8, 15);
        camera.position.set(0, 5, 20);
      } else if (newMode === 'moon_revolution') {
        sunLight.position.set(45, 0, 0); // Sinar Matahari datang sejajar dari kanan
        camera.position.set(0, 26, 30);
      } else if (newMode === 'solar_system') {
        sunLight.position.set(0, 0, 0);
        camera.position.set(0, 75, 105);
      }

      const sceneRadius = { earth_rotation: 10, earth_revolution: 30, moon_rotation: 7, moon_revolution: 18, solar_system: 86 }[newMode];
      fitCamera(sceneRadius);
      controls.update();
      updateEducationPanel(newMode);
    }

    function fitCamera(radius) {
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
      const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.15;
      const direction = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(direction, distance);
    }

    // Melukis Fase Bulan 2D Presisi di Layar Canvas Sesuai Sudut Revolusi Nyata
    const moonCanvas = document.getElementById('moon-phase-canvas');
    const moonCtx = moonCanvas.getContext('2d');
    const moonPhaseTitle = document.getElementById('badge-moon-phase-title');
    const moonPhaseDesc = document.getElementById('badge-moon-phase-desc');

    function drawRealisticMoonPhase(angleRad) {
      const w = 56, h = 56, r = 24;
      moonCtx.clearRect(0, 0, w, h);

      // Piringan Gelap Bulan (Permukaan Malam)
      moonCtx.fillStyle = '#1e293b';
      moonCtx.beginPath();
      moonCtx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      moonCtx.fill();

      // Normalisasi sudut ke rentang 0 s.d 360 derajat
      // Sudut 0: Sejajar arah datang matahari (+X) = Bulan Baru (Mati)
      // Sudut 90: Kuartir Pertama / Separuh
      // Sudut 180: Sisi berlawanan = Bulan Purnama
      // Sudut 270: Kuartir Ketiga / Akhir
      const deg = (THREE.MathUtils.radToDeg(angleRad) % 360 + 360) % 360;
      let phaseName = "Bulan Baru";
      let phaseDetail = "Bulan di antara Matahari & Bumi (0% Terang)";

      moonCtx.fillStyle = '#f8fafc';
      moonCtx.beginPath();

      if (deg >= 337.5 || deg < 22.5) {
        phaseName = "1. Bulan Baru (Mati)";
        phaseDetail = "0% Cahaya tampak dari Bumi";
      } else if (deg >= 22.5 && deg < 67.5) {
        phaseName = "2. Bulan Sabit Awal";
        phaseDetail = "Hilal Terlihat di Langit Senja (~25%)";
        moonCtx.arc(w / 2, h / 2, r, -Math.PI / 2, Math.PI / 2, false);
        moonCtx.ellipse(w / 2, h / 2, r * 0.45, r, 0, Math.PI / 2, -Math.PI / 2, false);
        moonCtx.fill();
      } else if (deg >= 67.5 && deg < 112.5) {
        phaseName = "3. Kuartir Pertama (Perbani Awal)";
        phaseDetail = "Bulan Separuh Sisi Kanan (~50%)";
        moonCtx.arc(w / 2, h / 2, r, -Math.PI / 2, Math.PI / 2, false);
        moonCtx.fill();
      } else if (deg >= 112.5 && deg < 157.5) {
        phaseName = "4. Bulan Cembung Awal";
        phaseDetail = "Mayoritas Terang Bertambah (~75%)";
        moonCtx.arc(w / 2, h / 2, r, -Math.PI / 2, Math.PI / 2, false);
        moonCtx.ellipse(w / 2, h / 2, r * 0.45, r, 0, Math.PI / 2, -Math.PI / 2, true);
        moonCtx.fill();
      } else if (deg >= 157.5 && deg < 202.5) {
        phaseName = "5. Bulan Purnama";
        phaseDetail = "100% Sisi Terang Menghadap Bumi";
        moonCtx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        moonCtx.fill();
      } else if (deg >= 202.5 && deg < 247.5) {
        phaseName = "6. Bulan Cembung Akhir";
        phaseDetail = "Cahaya Mulai Berkurang (~75%)";
        moonCtx.arc(w / 2, h / 2, r, Math.PI / 2, -Math.PI / 2, false);
        moonCtx.ellipse(w / 2, h / 2, r * 0.45, r, 0, -Math.PI / 2, Math.PI / 2, true);
        moonCtx.fill();
      } else if (deg >= 247.5 && deg < 292.5) {
        phaseName = "7. Kuartir Ketiga (Perbani Akhir)";
        phaseDetail = "Bulan Separuh Sisi Kiri (~50%)";
        moonCtx.arc(w / 2, h / 2, r, Math.PI / 2, -Math.PI / 2, false);
        moonCtx.fill();
      } else {
        phaseName = "8. Bulan Sabit Akhir";
        phaseDetail = "Tampak Menjelang Fajar Pagi (~25%)";
        moonCtx.arc(w / 2, h / 2, r, Math.PI / 2, -Math.PI / 2, false);
        moonCtx.ellipse(w / 2, h / 2, r * 0.45, r, 0, -Math.PI / 2, Math.PI / 2, false);
        moonCtx.fill();
      }

      moonPhaseTitle.textContent = phaseName;
      moonPhaseDesc.textContent = phaseDetail;
    }

    /* --- FOKUS KAMERA PLANET (ZOOM-IN TOUCH INSPECTION) --- */
    function focusOnPlanet(planetId) {
      playChime(640, 'triangle', 0.2);

      if (planetId === 'sun') {
        appState.currentPlanetFocus = null;
        controls.target.set(0, 0, 0);
        camera.position.set(0, 32, 50);
        controls.update();

        panelTitle.textContent = "Matahari (Bintang Pusat)";
        setSolarIcon(panelIcon, 'sun');
        panelContent.innerHTML = `
          <div class="space-y-3">
            <div class="p-3 bg-amber-900/40 border border-amber-500/40 rounded-xl">
              <span class="text-xs font-bold text-amber-300 uppercase block mb-1">Bintang Induk Tata Surya</span>
              <p>Matahari adalah <strong>bintang</strong> bola gas raksasa yang menyala karena fusi termonuklir hidrogen menjadi helium di intinya.</p>
            </div>
            <div>
              <h4 class="font-bold text-amber-300 mb-1">Fakta Spektakuler:</h4>
              <ul class="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                <li>Suhu fotosfer permukaan: <strong>5.500 °C</strong>, suhu inti mencapai <strong>15.000.000 °C</strong>!</li>
                <li>Ukuran masif: <strong>1.300.000 planet Bumi</strong> dapat dimasukkan ke dalamnya.</li>
                <li>Menyumbang <strong>99,86%</strong> dari total seluruh massa tata surya.</li>
              </ul>
            </div>
          </div>
        `;
        infoDrawer.classList.remove('translate-x-[110%]');
        return;
      }

      const pObj = solarPlanets.find(p => p.config.id === planetId);
      if (!pObj) return;

      appState.currentPlanetFocus = pObj;
      const targetPos = new THREE.Vector3();
      pObj.mesh.getWorldPosition(targetPos);

      controls.target.copy(targetPos);
      camera.position.set(
        targetPos.x + pObj.config.radius * 3.6,
        targetPos.y + pObj.config.radius * 2.2,
        targetPos.z + pObj.config.radius * 4.6
      );
      fitCamera(pObj.config.radius * (pObj.config.hasRings ? 2.8 : 1.6));
      controls.update();

      const conf = pObj.config;
      panelTitle.textContent = conf.name;
      setSolarIcon(panelIcon, planetId);
      panelContent.innerHTML = `
        <div class="space-y-3">
          <div class="p-3 bg-blue-900/40 border border-blue-500/30 rounded-xl">
            <span class="text-xs font-bold text-sky-300 uppercase block mb-1">Profil Planet</span>
            <p>${conf.desc}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-black/40 p-2.5 rounded-xl border border-white/10">
              <span class="text-slate-400 block">Jarak rata-rata:</span>
              <strong class="text-white text-sm">${conf.distanceKm.toLocaleString('id-ID')} Juta km</strong>
            </div>
            <div class="bg-black/40 p-2.5 rounded-xl border border-white/10">
              <span class="text-slate-400 block">Kala Revolusi:</span>
              <strong class="text-white text-sm">${conf.periodDays.toLocaleString('id-ID')} Hari</strong>
            </div>
          </div>

          <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
            <span class="text-emerald-300 font-bold block mb-1">💡 Fakta Sains IPAS SD:</span>
            <p class="text-emerald-100">Semakin jauh sebuah planet dari Matahari, semakin lambat kecepatannya berevolusi karena gaya gravitasi matahari yang dirasakannya semakin kecil!</p>
          </div>

          <button id="btn-back-overview" class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform">
            <span>🔭</span> Kembali ke Tinjauan Luas Tata Surya
          </button>
        </div>
      `;

      panelContent.innerHTML = replaceIconText(panelContent.innerHTML);
      infoDrawer.classList.remove('translate-x-[110%]');

      listen(document.getElementById('btn-back-overview'), 'click', () => {
        appState.currentPlanetFocus = null;
        controls.target.set(0, 0, 0);
        camera.position.set(0, 75, 105);
        fitCamera(86);
        controls.update();
        updateEducationPanel('solar_system');
      });
    }

    // Raycaster untuk Deteksi Ketukan Sentuh Layar pada Planet
    const raycaster = new THREE.Raycaster();
    const mousePointer = new THREE.Vector2();
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    listen(window, 'pointerdown', (e) => {
      touchStartTime = performance.now();
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    });

    listen(window, 'pointerup', (e) => {
      const touchDuration = performance.now() - touchStartTime;
      const moveDistance = Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY);

      // Hanya proses jika gestur berupa "Ketuk Cepat" (Tap), bukan seretan orbit (Drag)
      if (e.target !== canvas) return;
      if (touchDuration < 350 && moveDistance < 14 && appState.currentMode === 'solar_system') {
        mousePointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        mousePointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mousePointer, camera);
        const clickableMeshes = [sunMainMesh, ...solarPlanets.map(p => p.mesh)];
        const intersects = raycaster.intersectObjects(clickableMeshes, true);

        if (intersects.length > 0) {
          let hitObj = intersects[0].object;
          while (hitObj && !hitObj.userData.id && hitObj.parent) {
            hitObj = hitObj.parent;
          }
          if (hitObj && hitObj.userData && hitObj.userData.id) {
            focusOnPlanet(hitObj.userData.id);
          }
        }
      }
    });

    /* --- EVENT LISTENER KONTROL ANTARMUKA --- */
    // Navigasi Tab Mode
    document.querySelectorAll('.nav-tab').forEach(btn => {
      listen(btn, 'click', () => switchMode(btn.dataset.mode));
    });

    // Pemilih Planet Cepat
    document.querySelectorAll('.planet-select-btn').forEach(btn => {
      listen(btn, 'click', () => focusOnPlanet(btn.dataset.planet));
    });

    // Play / Pause Simulasi
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playPauseIcon = document.getElementById('play-pause-icon');
    listen(btnPlayPause, 'click', () => {
      playChime(480, 'sine', 0.1);
      appState.isPlaying = !appState.isPlaying;
      if (appState.isPlaying) {
        btnPlayPause.classList.replace('from-amber-500', 'from-emerald-500');
        btnPlayPause.classList.replace('to-orange-400', 'to-teal-400');
        setSolarIcon(playPauseIcon, 'pause');
      } else {
        btnPlayPause.classList.replace('from-emerald-500', 'from-amber-500');
        btnPlayPause.classList.replace('to-teal-400', 'to-orange-400');
        setSolarIcon(playPauseIcon, 'play');
      }
    });

    // Multiplier Kecepatan Waktu
    document.querySelectorAll('.speed-btn').forEach(btn => {
      listen(btn, 'click', () => {
        playChime(600, 'sine', 0.08);
        document.querySelectorAll('.speed-btn').forEach(b => {
          b.classList.remove('bg-blue-600', 'text-white', 'shadow');
          b.classList.add('text-slate-300');
        });
        btn.classList.add('bg-blue-600', 'text-white', 'shadow');
        btn.classList.remove('text-slate-300');
        appState.timeSpeed = parseFloat(btn.dataset.speed);
      });
    });

    // Reset Sudut Pandang Kamera
    listen(document.getElementById('btn-reset-cam'), 'click', () => {
      playChime(420, 'sine', 0.1);
      switchMode(appState.currentMode);
    });

    // Buka / Tutup Drawer Materi
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const btnToggleInfo = document.getElementById('btn-toggle-info');
    listen(btnCloseDrawer, 'click', () => {
      playChime(380, 'sine', 0.1);
      infoDrawer.classList.add('translate-x-[110%]');
    });
    listen(btnToggleInfo, 'click', () => {
      playChime(500, 'sine', 0.1);
      infoDrawer.classList.toggle('translate-x-[110%]');
    });

    // Popover Lapisan Visual Sains
    const btnToggleTools = document.getElementById('btn-toggle-tools');
    const toolsPopover = document.getElementById('tools-popover');
    const btnCloseTools = document.getElementById('btn-close-tools');
    listen(btnToggleTools, 'click', () => {
      playChime(460, 'sine', 0.08);
      toolsPopover.classList.toggle('hidden');
    });
    listen(btnCloseTools, 'click', () => toolsPopover.classList.add('hidden'));

    // Toggles Lapisan Visual
    listen(document.getElementById('chk-clouds'), 'change', (e) => {
      cloudMesh.visible = e.target.checked;
    });
    listen(document.getElementById('chk-axis'), 'change', (e) => {
      axisGroup.visible = e.target.checked;
      equatorRing.visible = e.target.checked;
      revAxis.visible = e.target.checked;
    });
    listen(document.getElementById('chk-orbits'), 'change', (e) => {
      revOrbitLine.visible = e.target.checked;
      moonOrbitLine.visible = e.target.checked;
      solarOrbitLines.forEach(line => line.visible = e.target.checked);
    });
    listen(document.getElementById('chk-corona'), 'change', (e) => {
      sunGlowMesh.visible = e.target.checked;
    });

    // Mode Layar Penuh (Fullscreen API) untuk Papan PID
    listen(document.getElementById('btn-fullscreen'), 'click', () => {
      playChime(580, 'sine', 0.12);
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });

    /* --- LOOP ANIMASI UTAMA & PERHITUNGAN REAL-TIME FISIKA --- */
    let earthRotAngle = 0;
    let earthRevNorm = 0; // 0 sampai 1
    let moonRevAngle = 0;

    function updateIndonesiaBadge() {
      const { phase, cosine } = indonesiaDaylight(earthMesh, indoBeaconGroup, sunLight);
      badgeIndo.dataset.phase = phase;
      badgeIndo.dataset.solarCosine = String(cosine);
      if (phase === 'day') {
        badgeIndoStatus.textContent = 'Sedang Siang Hari';
        badgeIndoStatus.className = 'text-sm sm:text-base font-bold text-amber-300';
        badgeIndoDetail.textContent = 'Wilayah Indonesia menghadap dan menerima cahaya Matahari';
        setSolarIcon(badgeIndoIcon, 'sun');
      } else if (phase === 'night') {
        badgeIndoStatus.textContent = 'Sedang Malam Hari';
        badgeIndoStatus.className = 'text-sm sm:text-base font-bold text-indigo-300';
        badgeIndoDetail.textContent = 'Wilayah Indonesia membelakangi Matahari';
        setSolarIcon(badgeIndoIcon, 'moon');
      } else {
        badgeIndoStatus.textContent = 'Batas Siang dan Malam';
        badgeIndoDetail.textContent = 'Wilayah Indonesia berada di garis cakrawala Matahari';
        setSolarIcon(badgeIndoIcon, 'sunrise');
      }
    }

    const clock = new THREE.Clock();
    let animationId = 0;
    function animate() {
      animationId = requestAnimationFrame(animate);
      const frameDelta = Math.min(clock.getDelta(), 0.05);

      if (appState.isPlaying) {
        const speed = appState.timeSpeed * frameDelta * 60;

        // --- 1. ANIMASI MODE ROTASI BUMI ---
        if (appState.currentMode === 'earth_rotation') {
          earthMesh.rotation.y += 0.012 * speed;
          cloudMesh.rotation.y += 0.014 * speed; // Awan berhembus lebih cepat

        }

        // --- 2. ANIMASI MODE REVOLUSI BUMI & 4 MUSIM ---
        if (appState.currentMode === 'earth_revolution') {
          earthRevNorm = (earthRevNorm + 0.0012 * speed) % 1.0;
          const pos = orbitPosition(revOrbitA, 0.0167, earthRevNorm * Math.PI * 2);
          revolvingEarthHolder.position.set(pos.x, pos.y, pos.z);

          // Bumi tetap berotasi pada porosnya sendiri sembari berevolusi
          revEarthMesh.rotation.y += 0.03 * speed;
          sunRevMesh.rotation.y += 0.002 * speed;

          // Deteksi Musim Terdekat
          const seasonBadgeTitle = document.getElementById('badge-season-title');
          const seasonBadgeDesc = document.getElementById('badge-season-desc');
          const seasonBadgeIcon = document.getElementById('badge-season-icon');

          if (earthRevNorm >= 0.18 && earthRevNorm < 0.38) {
            seasonBadgeTitle.textContent = "Solstis Juni (21 Juni)";
            seasonBadgeDesc.textContent = "BBU: Musim Panas (Siang Terpanjang) | BBS: Musim Dingin";
            setSolarIcon(seasonBadgeIcon, 'sun');
          } else if (earthRevNorm >= 0.38 && earthRevNorm < 0.65) {
            seasonBadgeTitle.textContent = "Ekuinoks September (23 September)";
            seasonBadgeDesc.textContent = "BBU: Musim Gugur | BBS: Musim Semi (Siang = Malam 12 Jam)";
            setSolarIcon(seasonBadgeIcon, 'leaf');
          } else if (earthRevNorm >= 0.65 && earthRevNorm < 0.88) {
            seasonBadgeTitle.textContent = "Solstis Desember (22 Desember)";
            seasonBadgeDesc.textContent = "BBU: Musim Dingin (Malam Terpanjang) | BBS: Musim Panas";
            setSolarIcon(seasonBadgeIcon, 'snow');
          } else {
            seasonBadgeTitle.textContent = "Ekuinoks Maret (21 Maret)";
            seasonBadgeDesc.textContent = "BBU: Musim Semi | BBS: Musim Gugur (Siang = Malam 12 Jam)";
            setSolarIcon(seasonBadgeIcon, 'flower');
          }
        }

        // --- 3. ANIMASI MODE ROTASI BULAN ---
        if (appState.currentMode === 'moon_rotation') {
          soloMoonMesh.rotation.y += 0.01 * speed;
        }

        // --- 4. ANIMASI MODE REVOLUSI BULAN & 8 FASE SINKRON ---
        if (appState.currentMode === 'moon_revolution') {
          moonRevAngle += 0.008 * speed;
          centerEarthMesh.rotation.y += 0.018 * speed;

          // Revolusi Bulan mengelilingi Bumi
          moonOrbitPivot.rotation.y = moonRevAngle;
          // Gerak Sinkron: Rotasi Bulan sama dengan kala revolusinya
          // Sehingga sisi dengan kawah/Near Side selalu menghadap pusat Bumi
          revMoonMesh.rotation.y = 0;

          // Render Fase Bulan 2D Presisi di Layar
          drawRealisticMoonPhase(moonRevAngle);
        }

        // --- 5. ANIMASI TATA SURYA 8 PLANET ---
        if (appState.currentMode === 'solar_system') {
          sunMainMesh.rotation.y += 0.0018 * speed;

          solarPlanets.forEach(p => {
            p.angle += (365.256 / p.config.periodDays * 0.008) * speed;
            const pos = orbitPosition(p.config.distance, p.config.eccentricity, p.angle, p.config.inclination);
            p.pivot.position.set(pos.x, pos.y, pos.z);
            p.mesh.rotation.y += p.config.rotSpeed * speed;
          });

          // Kamera mengikuti planet jika sedang difokuskan
          if (appState.currentPlanetFocus) {
            const pMesh = appState.currentPlanetFocus.mesh;
            pMesh.updateWorldMatrix(true, false);
            const targetPos = new THREE.Vector3();
            pMesh.getWorldPosition(targetPos);
            const shift = targetPos.clone().sub(controls.target);
            controls.target.copy(targetPos);
            camera.position.add(shift);
          }
        }
      }

      if (appState.currentMode === 'earth_rotation') updateIndonesiaBadge();
      controls.update();
      renderer.render(scene, camera);
    }

    // Penanganan Ukuran Layar Otomatis (Responsive Fullscreen PID)
    listen(window, 'resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Mulai Eksekusi Aplikasi Saat DOM Siap
    solarPlanets.forEach(p => { const pos = orbitPosition(p.config.distance, p.config.eccentricity, p.angle, p.config.inclination); p.pivot.position.set(pos.x, pos.y, pos.z); });
    revolvingEarthHolder.position.set(revOrbitA * (1 - 0.0167), 0, 0);
    switchMode('earth_rotation');
    animate();
  
  return () => {
    cancelAnimationFrame(animationId);
    listeners.forEach(remove => remove());
    controls.dispose();
    scene.traverse(object => { object.geometry?.dispose(); const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(mat => mat?.dispose()); });
    Object.values(textures).forEach(texture => texture.dispose());
    renderer.dispose();
    audioCtx?.close();
  };
}
