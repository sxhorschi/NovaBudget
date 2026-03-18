/**
 * Mock data for development and demo mode.
 * This data is NOT used in production — the real data comes from the API.
 * Names, amounts, and dates are fictional.
 */

import type {
  Facility,
  Department,
  WorkArea,
  CostItem,
  BudgetSummary,
  DepartmentSummary,
  CashOutEntry,
  BudgetAdjustment,
} from '../types/budget';

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

// --- Facilities ---

export const mockFacility: Facility = {
  id: 'f-001',
  name: '3k Factory',
  location: 'Augsburg, Germany',
  description: 'NovaDrive Motors — Main CAPEX facility for EV drivetrain and vehicle assembly',
};

export const mockFacility2: Facility = {
  id: 'f-002',
  name: '5k Factory',
  location: 'Munich, Germany',
  description: 'NovaDrive Motors — Expansion facility for high-volume EV production',
};

export const mockFacility3: Facility = {
  id: 'f-003',
  name: 'Retrofit — Stuttgart',
  location: 'Stuttgart, Germany',
  description: 'Legacy plant retrofit for Orion EV line conversion',
};

export const mockFacility4: Facility = {
  id: 'f-004',
  name: 'Prototype Lab — Berlin',
  location: 'Berlin, Germany',
  description: 'Rapid prototyping and validation center for Vega concept',
};

export const mockFacilities: Facility[] = [mockFacility, mockFacility2, mockFacility3, mockFacility4];

// --- Departments ---

export const mockDepartments: Department[] = [
  { id: 'd-001', facility_id: 'f-001', name: 'Assembly', budget_total: 3_800_000 },
  { id: 'd-002', facility_id: 'f-001', name: 'Testing', budget_total: 1_500_000 },
  { id: 'd-003', facility_id: 'f-001', name: 'Intralogistics', budget_total: 700_000 },
  { id: 'd-004', facility_id: 'f-001', name: 'Building & Infrastructure', budget_total: 1_200_000 },
  { id: 'd-005', facility_id: 'f-001', name: 'Prototyping Lab', budget_total: 500_000 },
];

// --- Work Areas ---

export const mockWorkAreas: WorkArea[] = [
  // Assembly (Dept d-001)
  { id: 'wa-001', department_id: 'd-001', name: 'Chassis Assembly' },
  { id: 'wa-002', department_id: 'd-001', name: 'Drivetrain Station' },
  { id: 'wa-003', department_id: 'd-001', name: 'Battery Pack Line' },
  { id: 'wa-004', department_id: 'd-001', name: 'Final Assembly & Marriage' },
  { id: 'wa-005', department_id: 'd-001', name: 'Rework & Touch-Up Bay' },
  // Testing (Dept d-002)
  { id: 'wa-006', department_id: 'd-002', name: 'End-of-Line Testing' },
  { id: 'wa-007', department_id: 'd-002', name: 'Environmental Chamber' },
  { id: 'wa-008', department_id: 'd-002', name: 'NVH & Vibration Lab' },
  { id: 'wa-009', department_id: 'd-002', name: 'High-Voltage Safety Test' },
  // Intralogistics (Dept d-003)
  { id: 'wa-010', department_id: 'd-003', name: 'Goods-In & Receiving' },
  { id: 'wa-011', department_id: 'd-003', name: 'Warehouse & Staging' },
  { id: 'wa-012', department_id: 'd-003', name: 'AGV & Internal Transport' },
  { id: 'wa-013', department_id: 'd-003', name: 'Shipping & Packaging' },
  // Building & Infrastructure (Dept d-004)
  { id: 'wa-014', department_id: 'd-004', name: 'Electrical Distribution' },
  { id: 'wa-015', department_id: 'd-004', name: 'HVAC & Climate Control' },
  { id: 'wa-016', department_id: 'd-004', name: 'Safety & Fire Protection' },
  { id: 'wa-017', department_id: 'd-004', name: 'Flooring & Structural' },
  // Prototyping Lab (Dept d-005)
  { id: 'wa-018', department_id: 'd-005', name: 'CNC & Machining Center' },
  { id: 'wa-019', department_id: 'd-005', name: 'Additive Manufacturing' },
  { id: 'wa-020', department_id: 'd-005', name: 'Metrology & Inspection' },
];

// --- Cost Items ---

export const mockCostItems: CostItem[] = [
  // ============================================================
  // DEPARTMENT 1: Assembly (~3.8M budget)
  // ============================================================

  // --- WA 1: Chassis Assembly — 6 Items ---
  {
    id: 'ci-001', work_area_id: 'wa-001', description: 'Automated Torque Station T-400 (4-Spindle)',
    original_amount: 245_000, current_amount: 258_000,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer Desoutter Tools GmbH', assumptions: '4 spindles, torque range 1-50 Nm, integrated poka-yoke',
    approval_status: 'approved', approval_date: '2026-01-12', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Georg Weis', created_at: '2025-11-01', updated_at: '2026-01-12',
  },
  {
    id: 'ci-002', work_area_id: 'wa-001', description: 'Chassis Marriage Lift System CML-800',
    original_amount: 320_000, current_amount: 320_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Dürr Assembly Products', assumptions: 'Lift capacity 1200 kg, servo-driven, 3 positions',
    approval_status: 'approved', approval_date: '2026-01-20', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '', comments: 'Lead time 16 weeks confirmed',
    requester: 'Anna Schmidt', created_at: '2025-11-05', updated_at: '2026-01-20',
  },
  {
    id: 'ci-003', work_area_id: 'wa-001', description: 'Adhesive Dispensing Robot Cell (Henkel Loctite)',
    original_amount: 185_000, current_amount: 197_500,
    expected_cash_out: '2026-06', cost_basis: 'revised_supplier_offer', cost_driver: 'product',
    basis_description: 'Revised offer Henkel AG — 2nd negotiation round', assumptions: '2-component PU adhesive, 0.1mm precision',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_1',
    product: 'atlas', zielanpassung: true, zielanpassung_reason: 'Supplier increased price due to material cost', comments: 'Escalated to dept head',
    requester: 'Thomas Mueller', created_at: '2025-11-10', updated_at: '2026-02-05',
  },
  {
    id: 'ci-004', work_area_id: 'wa-001', description: 'Subframe Fixture Set SF-12 (Atlas + Orion)',
    original_amount: 78_000, current_amount: 78_000,
    expected_cash_out: '2026-03', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Internal estimation based on similar fixture at Werk Nord', assumptions: '12 fixtures for 2 product variants',
    approval_status: 'approved', approval_date: '2026-01-08', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Georg Weis', created_at: '2025-10-20', updated_at: '2026-01-08',
  },
  {
    id: 'ci-005', work_area_id: 'wa-001', description: 'Manual Workbench Station MWS-3 (x4)',
    original_amount: 32_000, current_amount: 34_200,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Bott GmbH', assumptions: '4 stations, ESD, height-adjustable, tool holders',
    approval_status: 'approved', approval_date: '2026-01-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Lisa Berger', created_at: '2025-10-15', updated_at: '2026-01-05',
  },
  {
    id: 'ci-006', work_area_id: 'wa-001', description: 'Collaborative Robot Arm UR-20 (Pick & Place)',
    original_amount: 95_000, current_amount: 95_000,
    expected_cash_out: '2026-07', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Universal Robots / Systemintegrator Schmalz', assumptions: 'Payload 20 kg, reach 1750mm, gripper included',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_2',
    product: 'orion', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Markus Weber', created_at: '2025-12-01', updated_at: '2026-02-10',
  },

  // --- WA 2: Drivetrain Station — 5 Items ---
  {
    id: 'ci-007', work_area_id: 'wa-002', description: 'E-Motor Assembly Press HPP-250 (250kN)',
    original_amount: 210_000, current_amount: 210_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer Kistler Instruments', assumptions: 'Servo press 250 kN, force-displacement monitoring',
    approval_status: 'approved', approval_date: '2026-02-01', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Sophie Klein', created_at: '2025-11-15', updated_at: '2026-02-01',
  },
  {
    id: 'ci-008', work_area_id: 'wa-002', description: 'Gear Unit Test Bench GT-500',
    original_amount: 165_000, current_amount: 172_000,
    expected_cash_out: '2026-06', cost_basis: 'revised_supplier_offer', cost_driver: 'product',
    basis_description: 'Revised offer Teamtechnik GmbH', assumptions: 'Max speed 12,000 rpm, torque sensor 500 Nm',
    approval_status: 'approved', approval_date: '2026-01-28', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: true, zielanpassung_reason: 'Scope extended to cover Orion variant', comments: '',
    requester: 'Jan Hoffmann', created_at: '2025-11-20', updated_at: '2026-01-28',
  },
  {
    id: 'ci-009', work_area_id: 'wa-002', description: 'Rotor Balancing Machine RBM-3000',
    original_amount: 135_000, current_amount: 135_000,
    expected_cash_out: '2026-07', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Budget estimation based on Schenck RoTec catalog', assumptions: 'Rotor weight up to 30 kg, 2-plane balancing',
    approval_status: 'open', approval_date: null, project_phase: 'phase_2',
    product: 'orion', zielanpassung: false, zielanpassung_reason: '', comments: 'RFQ to be sent Q1 2026',
    requester: 'Eva Fischer', created_at: '2025-12-05', updated_at: '2025-12-05',
  },
  {
    id: 'ci-010', work_area_id: 'wa-002', description: 'Stator Winding Insertion Tool SWI-6',
    original_amount: 88_000, current_amount: 92_400,
    expected_cash_out: '2026-08', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer Marsilli SpA', assumptions: '6-pole stator, hairpin winding compatible',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_2',
    product: 'orion', zielanpassung: true, zielanpassung_reason: 'Additional tooling for Vega variant needed', comments: '',
    requester: 'Georg Weis', created_at: '2025-12-10', updated_at: '2026-02-15',
  },
  {
    id: 'ci-011', work_area_id: 'wa-002', description: 'Drivetrain Transport Dolly DD-4 (x8)',
    original_amount: 24_000, current_amount: 24_000,
    expected_cash_out: '2026-03', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '8 dollies, 500 kg capacity, lockable castors',
    approval_status: 'approved', approval_date: '2025-12-20', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Anna Schmidt', created_at: '2025-10-25', updated_at: '2025-12-20',
  },

  // --- WA 3: Battery Pack Line — 6 Items ---
  {
    id: 'ci-012', work_area_id: 'wa-003', description: 'Battery Module Press-Fit Unit BPF-200',
    original_amount: 275_000, current_amount: 289_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer ThyssenKrupp System Engineering', assumptions: 'Press force 200 kN, cycle time < 45s',
    approval_status: 'approved', approval_date: '2026-02-10', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: true, zielanpassung_reason: 'Price increase due to safety enclosure upgrade', comments: '',
    requester: 'Thomas Mueller', created_at: '2025-11-08', updated_at: '2026-02-10',
  },
  {
    id: 'ci-013', work_area_id: 'wa-003', description: 'Thermal Paste Dispensing System TPD-1',
    original_amount: 68_000, current_amount: 68_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Nordson EFD', assumptions: 'Volumetric dispensing, ±2% accuracy',
    approval_status: 'approved', approval_date: '2026-01-22', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-12', updated_at: '2026-01-22',
  },
  {
    id: 'ci-014', work_area_id: 'wa-003', description: 'Battery Pack Leak Test Station (Helium)',
    original_amount: 195_000, current_amount: 195_000,
    expected_cash_out: '2026-07', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Budget estimate based on Inficon benchmark', assumptions: 'Helium leak rate < 1×10⁻⁵ mbar·l/s',
    approval_status: 'open', approval_date: null, project_phase: 'phase_2',
    product: 'vega', zielanpassung: false, zielanpassung_reason: '', comments: 'Waiting for Vega pack design freeze',
    created_at: '2025-12-15', updated_at: '2025-12-15',
  },
  {
    id: 'ci-015', work_area_id: 'wa-003', description: 'HV Busbar Welding Cell (Laser)',
    original_amount: 340_000, current_amount: 355_000,
    expected_cash_out: '2026-08', cost_basis: 'revised_supplier_offer', cost_driver: 'product',
    basis_description: 'Revised offer TRUMPF GmbH', assumptions: '4 kW fiber laser, 6-axis gantry',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_2',
    product: 'atlas', zielanpassung: true, zielanpassung_reason: 'Laser source upgrade from 3 kW to 4 kW', comments: '',
    created_at: '2025-12-01', updated_at: '2026-02-20',
  },
  {
    id: 'ci-016', work_area_id: 'wa-003', description: 'Cell Module Stacking Gripper CSG-8',
    original_amount: 115_000, current_amount: 115_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer Schunk GmbH', assumptions: 'Gripper for prismatic cells, max 8 cells/cycle',
    approval_status: 'approved', approval_date: '2026-01-30', project_phase: 'phase_1',
    product: 'vega', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-18', updated_at: '2026-01-30',
  },
  {
    id: 'ci-017', work_area_id: 'wa-003', description: 'Battery Pack EOL Charge/Discharge Tester',
    original_amount: 220_000, current_amount: 220_000,
    expected_cash_out: '2026-09', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Budget based on Digatron reference', assumptions: 'Voltage range 200-800V, 250A max',
    approval_status: 'on_hold', approval_date: null, project_phase: 'phase_3',
    product: 'vega', zielanpassung: false, zielanpassung_reason: '', comments: 'On hold pending Vega SOP confirmation',
    created_at: '2025-12-20', updated_at: '2026-01-10',
  },

  // --- WA 4: Final Assembly & Marriage — 5 Items ---
  {
    id: 'ci-018', work_area_id: 'wa-004', description: 'Vehicle Marriage Station VMS-2000 (Chassis-Body)',
    original_amount: 420_000, current_amount: 420_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Dürr Assembly Products', assumptions: '2-post lift, automated bolt runner, 6 attachment points',
    approval_status: 'approved', approval_date: '2026-02-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Shared across Atlas/Orion/Vega',
    created_at: '2025-11-01', updated_at: '2026-02-05',
  },
  {
    id: 'ci-019', work_area_id: 'wa-004', description: 'Windshield Setting Robot WSR-1 (Fanuc)',
    original_amount: 155_000, current_amount: 162_000,
    expected_cash_out: '2026-07', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Fanuc Deutschland / integrator IMA', assumptions: 'Vision-guided, primer + adhesive application',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_1',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'Added vision system for quality check', comments: '',
    created_at: '2025-11-25', updated_at: '2026-02-18',
  },
  {
    id: 'ci-020', work_area_id: 'wa-004', description: 'Conveyor Transfer System C-12 (Skid-Based)',
    original_amount: 185_000, current_amount: 185_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Eisenmann GmbH', assumptions: '12 stations, EHB overhead conveyor, 4.5m pitch',
    approval_status: 'approved', approval_date: '2026-01-18', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-05', updated_at: '2026-01-18',
  },
  {
    id: 'ci-021', work_area_id: 'wa-004', description: 'Door Assembly Jig DAJ-LR (Left + Right)',
    original_amount: 62_000, current_amount: 62_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Internal cost estimation', assumptions: '2 jigs (left/right), manual operation',
    approval_status: 'approved', approval_date: '2026-01-10', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-28', updated_at: '2026-01-10',
  },
  {
    id: 'ci-022', work_area_id: 'wa-004', description: 'Fluid Fill Station (Brake + Coolant + AC)',
    original_amount: 98_000, current_amount: 103_500,
    expected_cash_out: '2026-08', cost_basis: 'revised_supplier_offer', cost_driver: 'process',
    basis_description: 'Revised offer Dürr Somac', assumptions: '3-fluid simultaneous fill, vacuum-based',
    approval_status: 'pending_supplier_negotiation', approval_date: null, project_phase: 'phase_2',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'AC refrigerant module added', comments: 'Negotiation ongoing',
    created_at: '2025-12-08', updated_at: '2026-02-25',
  },

  // --- WA 5: Rework & Touch-Up Bay — 4 Items ---
  {
    id: 'ci-023', work_area_id: 'wa-005', description: 'Paint Touch-Up Booth PTB-1 (with extraction)',
    original_amount: 45_000, current_amount: 45_000,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Junair spray booths', assumptions: 'Downdraft extraction, 3m x 6m booth',
    approval_status: 'approved', approval_date: '2026-01-15', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-02', updated_at: '2026-01-15',
  },
  {
    id: 'ci-024', work_area_id: 'wa-005', description: 'Diagnostic Laptop Kit DLK-10 (x10)',
    original_amount: 28_000, current_amount: 28_000,
    expected_cash_out: '2026-03', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '10 laptops with OBD interface + software license',
    approval_status: 'approved', approval_date: '2025-12-15', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-20', updated_at: '2025-12-15',
  },
  {
    id: 'ci-025', work_area_id: 'wa-005', description: 'Headlamp Aim Adjustment Tool HAA-2',
    original_amount: 18_500, current_amount: 18_500,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Hella Gutmann', assumptions: 'Digital aimer with camera, all ECE standards',
    approval_status: 'approved', approval_date: '2026-01-08', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-01', updated_at: '2026-01-08',
  },
  {
    id: 'ci-026', work_area_id: 'wa-005', description: 'Rework Lift Table RLT-500 (x2)',
    original_amount: 14_000, current_amount: 14_800,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Flexlift', assumptions: '2 tables, 500 kg capacity, scissor lift',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-10', updated_at: '2026-02-01',
  },

  // ============================================================
  // DEPARTMENT 2: Testing (~1.5M budget)
  // ============================================================

  // --- WA 6: End-of-Line Testing — 5 Items ---
  {
    id: 'ci-027', work_area_id: 'wa-006', description: 'End-of-Line Tester EOL-5000 (Complete System)',
    original_amount: 380_000, current_amount: 395_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Marposs SpA', assumptions: 'ADAS calibration, brake test, steering, suspension check',
    approval_status: 'approved', approval_date: '2026-02-01', project_phase: 'phase_1',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'ADAS module scope expanded', comments: '',
    created_at: '2025-11-01', updated_at: '2026-02-01',
  },
  {
    id: 'ci-028', work_area_id: 'wa-006', description: 'Roll Test Dyno Stand RD-200',
    original_amount: 195_000, current_amount: 195_000,
    expected_cash_out: '2026-07', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer MAHA GmbH', assumptions: 'Single roller set, max 200 km/h, 4WD capable',
    approval_status: 'approved', approval_date: '2026-01-25', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-08', updated_at: '2026-01-25',
  },
  {
    id: 'ci-029', work_area_id: 'wa-006', description: 'Wheel Alignment System WAS-3D',
    original_amount: 72_000, current_amount: 72_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Beissbarth GmbH', assumptions: '3D camera-based, all models',
    approval_status: 'approved', approval_date: '2026-01-15', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-05', updated_at: '2026-01-15',
  },
  {
    id: 'ci-030', work_area_id: 'wa-006', description: 'HV Isolation Resistance Tester HIT-1000',
    original_amount: 55_000, current_amount: 58_200,
    expected_cash_out: '2026-06', cost_basis: 'revised_supplier_offer', cost_driver: 'product',
    basis_description: 'Revised offer Megger GmbH', assumptions: 'Test voltage up to 1000V DC, automated reporting',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_1',
    product: 'atlas', zielanpassung: true, zielanpassung_reason: 'Extended voltage range requested', comments: '',
    created_at: '2025-11-20', updated_at: '2026-02-12',
  },
  {
    id: 'ci-031', work_area_id: 'wa-006', description: 'Vehicle Data Logger & Flash Station VDL-8',
    original_amount: 42_000, current_amount: 42_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'process',
    basis_description: 'Internal estimation', assumptions: '8 channels, CAN/LIN/Ethernet, OTA flash capability',
    approval_status: 'approved', approval_date: '2026-01-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-25', updated_at: '2026-01-05',
  },

  // --- WA 7: Environmental Chamber — 4 Items ---
  {
    id: 'ci-032', work_area_id: 'wa-007', description: 'Water Ingress Test Chamber IP67',
    original_amount: 125_000, current_amount: 125_000,
    expected_cash_out: '2026-08', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Weiss Technik', assumptions: 'Full vehicle chamber, rain + immersion test',
    approval_status: 'on_hold', approval_date: null, project_phase: 'phase_3',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Postponed to align with building readiness',
    created_at: '2025-12-01', updated_at: '2026-01-20',
  },
  {
    id: 'ci-033', work_area_id: 'wa-007', description: 'Climate Chamber -40°C to +80°C (Component)',
    original_amount: 88_000, current_amount: 88_000,
    expected_cash_out: '2026-09', cost_basis: 'cost_estimation', cost_driver: 'process',
    basis_description: 'Budget estimate based on Vötsch catalog', assumptions: 'Walk-in chamber 3m³, ±0.5°C accuracy',
    approval_status: 'open', approval_date: null, project_phase: 'phase_3',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-12-10', updated_at: '2025-12-10',
  },
  {
    id: 'ci-034', work_area_id: 'wa-007', description: 'Dust Exposure Test Chamber (IP5X/IP6X)',
    original_amount: 65_000, current_amount: 68_500,
    expected_cash_out: '2026-10', cost_basis: 'cost_estimation', cost_driver: 'process',
    basis_description: 'Budget estimate', assumptions: 'Fine dust + talcum powder test per IEC 60529',
    approval_status: 'open', approval_date: null, project_phase: 'phase_3',
    product: 'vega', zielanpassung: true, zielanpassung_reason: 'Added IP6X capability', comments: '',
    created_at: '2025-12-15', updated_at: '2026-02-05',
  },
  {
    id: 'ci-035', work_area_id: 'wa-007', description: 'Salt Spray Corrosion Cabinet SSC-1',
    original_amount: 22_000, current_amount: 22_000,
    expected_cash_out: '2026-07', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Ascott Analytical', assumptions: 'ASTM B117, 1000-hour capacity',
    approval_status: 'approved', approval_date: '2026-02-08', project_phase: 'phase_2',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-28', updated_at: '2026-02-08',
  },

  // --- WA 8: NVH & Vibration Lab — 3 Items ---
  {
    id: 'ci-036', work_area_id: 'wa-008', description: 'NVH Analysis Booth (Semi-Anechoic)',
    original_amount: 110_000, current_amount: 110_000,
    expected_cash_out: '2026-09', cost_basis: 'cost_estimation', cost_driver: 'process',
    basis_description: 'Budget estimate based on IAC Acoustics reference', assumptions: 'Background noise < 20 dB(A), 5m x 5m',
    approval_status: 'open', approval_date: null, project_phase: 'phase_3',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Design phase Q2 2026',
    created_at: '2025-12-20', updated_at: '2025-12-20',
  },
  {
    id: 'ci-037', work_area_id: 'wa-008', description: 'Vibration Shaker System (Electrodynamic)',
    original_amount: 85_000, current_amount: 85_000,
    expected_cash_out: '2026-10', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Budget estimate', assumptions: '50 kN force, 5-2000 Hz, slip table included',
    approval_status: 'pending_technical_clarification', approval_date: null, project_phase: 'phase_4',
    product: 'orion', zielanpassung: false, zielanpassung_reason: '', comments: 'Spec TBD by testing team',
    created_at: '2026-01-05', updated_at: '2026-01-05',
  },
  {
    id: 'ci-038', work_area_id: 'wa-008', description: 'Acoustic Measurement Kit (B&K Microphones x12)',
    original_amount: 36_000, current_amount: 36_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Brüel & Kjær', assumptions: '12 free-field microphones + PULSE analyzer',
    approval_status: 'approved', approval_date: '2026-01-28', project_phase: 'phase_2',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-12-01', updated_at: '2026-01-28',
  },

  // --- WA 9: High-Voltage Safety Test — 4 Items ---
  {
    id: 'ci-039', work_area_id: 'wa-009', description: 'High-Voltage Leak Detection Unit HVLD-2',
    original_amount: 78_000, current_amount: 78_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer HIOKI E.E. Corporation', assumptions: 'AC/DC hipot 5 kV, insulation tester, earth bond',
    approval_status: 'approved', approval_date: '2026-01-20', project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-15', updated_at: '2026-01-20',
  },
  {
    id: 'ci-040', work_area_id: 'wa-009', description: 'Battery Abuse Test Rig (Nail Pen + Crush)',
    original_amount: 145_000, current_amount: 145_000,
    expected_cash_out: '2026-11', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Budget estimate based on UTAC reference', assumptions: 'UN38.3 + GB/T compliance, blast-proof enclosure',
    approval_status: 'open', approval_date: null, project_phase: 'phase_4',
    product: 'vega', zielanpassung: false, zielanpassung_reason: '', comments: 'Required for homologation',
    created_at: '2026-01-10', updated_at: '2026-01-10',
  },
  {
    id: 'ci-041', work_area_id: 'wa-009', description: 'Partial Discharge Measurement System PDM-1',
    original_amount: 52_000, current_amount: 52_000,
    expected_cash_out: '2026-08', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer Omicron Electronics', assumptions: 'PD detection in HV cables and connectors',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_2',
    product: 'orion', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-12-05', updated_at: '2026-02-10',
  },
  {
    id: 'ci-042', work_area_id: 'wa-009', description: 'HV Safety PPE Set & Emergency Shutdown Panel',
    original_amount: 15_000, current_amount: 15_000,
    expected_cash_out: '2026-03', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '5 PPE sets (gloves, mats, rescue hooks) + 2 E-stop panels',
    approval_status: 'approved', approval_date: '2025-12-10', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-15', updated_at: '2025-12-10',
  },

  // ============================================================
  // DEPARTMENT 3: Intralogistics (~700k budget)
  // ============================================================

  // --- WA 10: Goods-In & Receiving — 3 Items ---
  {
    id: 'ci-043', work_area_id: 'wa-010', description: 'Goods-In Inspection Station GIS-2 (with scale)',
    original_amount: 38_000, current_amount: 38_000,
    expected_cash_out: '2026-03', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Mettler Toledo', assumptions: '2 inspection tables, floor scale 1500 kg, barcode scanner',
    approval_status: 'approved', approval_date: '2025-12-18', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-20', updated_at: '2025-12-18',
  },
  {
    id: 'ci-044', work_area_id: 'wa-010', description: 'Receiving Area Roller Conveyor RC-6',
    original_amount: 22_000, current_amount: 22_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '6m gravity roller, pallet width',
    approval_status: 'approved', approval_date: '2025-12-20', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-22', updated_at: '2025-12-20',
  },
  {
    id: 'ci-045', work_area_id: 'wa-010', description: 'Label Printer & Scanning Gateway LSG-1',
    original_amount: 8_500, current_amount: 8_500,
    expected_cash_out: '2026-02', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: 'Zebra thermal printer + 3 handheld scanners',
    approval_status: 'approved', approval_date: '2025-12-01', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-10', updated_at: '2025-12-01',
  },

  // --- WA 11: Warehouse & Staging — 4 Items ---
  {
    id: 'ci-046', work_area_id: 'wa-011', description: 'Vertical Lift Module Kardex-500 (2 units)',
    original_amount: 145_000, current_amount: 152_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Kardex Remstar', assumptions: '2 VLMs, 500 kg/tray, 250 trays each, WMS integrated',
    approval_status: 'approved', approval_date: '2026-01-25', project_phase: 'phase_1',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'Added WMS interface module', comments: '',
    created_at: '2025-11-05', updated_at: '2026-01-25',
  },
  {
    id: 'ci-047', work_area_id: 'wa-011', description: 'Kanban Supermarket Rack System KSR-24',
    original_amount: 35_000, current_amount: 35_000,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Bito-Lagertechnik', assumptions: '24 flow rack lanes, KLT 400x300 and 600x400',
    approval_status: 'approved', approval_date: '2026-01-10', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-01', updated_at: '2026-01-10',
  },
  {
    id: 'ci-048', work_area_id: 'wa-011', description: 'Pallet Racking System (Heavy Duty, 120 bays)',
    original_amount: 62_000, current_amount: 62_000,
    expected_cash_out: '2026-03', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Jungheinrich Racking', assumptions: '120 bays, 3 levels, 1000 kg/pallet',
    approval_status: 'approved', approval_date: '2025-12-15', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-25', updated_at: '2025-12-15',
  },
  {
    id: 'ci-049', work_area_id: 'wa-011', description: 'Returnable Packaging Set (KLT + Pallets)',
    original_amount: 28_000, current_amount: 28_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '500 KLTs, 100 special pallets for battery modules',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-10', updated_at: '2026-02-01',
  },

  // --- WA 12: AGV & Internal Transport — 3 Items ---
  {
    id: 'ci-050', work_area_id: 'wa-012', description: 'AGV Fleet (5 units) — Jungheinrich EZS 350a',
    original_amount: 185_000, current_amount: 185_000,
    expected_cash_out: '2026-07', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Jungheinrich Logistik', assumptions: '5 AGVs, payload 1200 kg, SLAM navigation, fleet manager',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_2',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Demo scheduled April 2026',
    created_at: '2025-12-01', updated_at: '2026-02-15',
  },
  {
    id: 'ci-051', work_area_id: 'wa-012', description: 'Electric Tow Tractor ETT-3 (x2)',
    original_amount: 32_000, current_amount: 32_000,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Still GmbH', assumptions: '2 tractors, 3000 kg towing capacity',
    approval_status: 'approved', approval_date: '2026-01-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-28', updated_at: '2026-01-05',
  },
  {
    id: 'ci-052', work_area_id: 'wa-012', description: 'Tugger Train Route Markers & Floor Guidance',
    original_amount: 8_000, current_amount: 8_000,
    expected_cash_out: '2026-03', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: 'Floor tape, magnetic strips, route signage',
    approval_status: 'approved', approval_date: '2025-12-10', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-15', updated_at: '2025-12-10',
  },

  // --- WA 13: Shipping & Packaging — 3 Items ---
  {
    id: 'ci-053', work_area_id: 'wa-013', description: 'Packaging Line PL-3 (Stretch Wrap + Strapping)',
    original_amount: 42_000, current_amount: 44_500,
    expected_cash_out: '2026-05', cost_basis: 'revised_supplier_offer', cost_driver: 'process',
    basis_description: 'Revised offer Mosca GmbH', assumptions: 'Semi-auto stretch wrapper + strapping machine',
    approval_status: 'approved', approval_date: '2026-01-30', project_phase: 'phase_1',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'Strapping unit upgraded to dual-head', comments: '',
    created_at: '2025-11-15', updated_at: '2026-01-30',
  },
  {
    id: 'ci-054', work_area_id: 'wa-013', description: 'Shipping Scale & Dimension Scanner SDS-1',
    original_amount: 12_000, current_amount: 12_000,
    expected_cash_out: '2026-03', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Mettler Toledo', assumptions: 'Platform scale + overhead dimension scanner',
    approval_status: 'approved', approval_date: '2025-12-20', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-20', updated_at: '2025-12-20',
  },
  {
    id: 'ci-055', work_area_id: 'wa-013', description: 'Loading Dock Leveler (Hydraulic, 2 docks)',
    original_amount: 18_000, current_amount: 18_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '2 hydraulic dock levelers, 6 ton capacity',
    approval_status: 'approved', approval_date: '2025-12-22', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-18', updated_at: '2025-12-22',
  },

  // ============================================================
  // DEPARTMENT 4: Building & Infrastructure (~1.2M budget)
  // ============================================================

  // --- WA 14: Electrical Distribution — 4 Items ---
  {
    id: 'ci-056', work_area_id: 'wa-014', description: 'Busbar Power Distribution 400V (Main Hall)',
    original_amount: 165_000, current_amount: 172_000,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Siemens Energy', assumptions: '2500A busbar, 12 tap-off units, main hall',
    approval_status: 'approved', approval_date: '2026-01-15', project_phase: 'phase_1',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'Added 2 additional tap-off points', comments: '',
    created_at: '2025-11-01', updated_at: '2026-01-15',
  },
  {
    id: 'ci-057', work_area_id: 'wa-014', description: 'Transformer Station 20kV/400V (800 kVA)',
    original_amount: 125_000, current_amount: 125_000,
    expected_cash_out: '2026-03', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer ABB Ltd.', assumptions: 'Oil-cooled, outdoor installation',
    approval_status: 'approved', approval_date: '2025-12-20', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Utility connection approved by Stadtwerke',
    created_at: '2025-10-15', updated_at: '2025-12-20',
  },
  {
    id: 'ci-058', work_area_id: 'wa-014', description: 'UPS System 60 kVA (Testing Area)',
    original_amount: 38_000, current_amount: 38_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Eaton Power', assumptions: 'Online double-conversion, 15 min battery backup',
    approval_status: 'approved', approval_date: '2026-01-10', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-05', updated_at: '2026-01-10',
  },
  {
    id: 'ci-059', work_area_id: 'wa-014', description: 'EV Charging Infrastructure (20 AC + 4 DC)',
    original_amount: 85_000, current_amount: 89_000,
    expected_cash_out: '2026-06', cost_basis: 'revised_supplier_offer', cost_driver: 'process',
    basis_description: 'Revised offer ABB E-mobility', assumptions: '20x 22kW AC + 4x 150kW DC fast chargers',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_2',
    product: 'overall', zielanpassung: true, zielanpassung_reason: '4 DC chargers added (originally AC only)', comments: '',
    created_at: '2025-12-01', updated_at: '2026-02-20',
  },

  // --- WA 15: HVAC & Climate Control — 4 Items ---
  {
    id: 'ci-060', work_area_id: 'wa-015', description: 'Central HVAC System (Assembly Hall 4000m²)',
    original_amount: 195_000, current_amount: 195_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Caverion GmbH', assumptions: 'Heating/cooling, 22±2°C, humidity control 40-60%',
    approval_status: 'approved', approval_date: '2026-02-01', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-10', updated_at: '2026-02-01',
  },
  {
    id: 'ci-061', work_area_id: 'wa-015', description: 'Clean Room HVAC (Battery Area, ISO 8)',
    original_amount: 78_000, current_amount: 82_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'process',
    basis_description: 'Offer Trox GmbH', assumptions: 'ISO 8, 200m², HEPA H13 filters',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_1',
    product: 'vega', zielanpassung: true, zielanpassung_reason: 'Area expanded from 150m² to 200m²', comments: '',
    created_at: '2025-11-20', updated_at: '2026-02-15',
  },
  {
    id: 'ci-062', work_area_id: 'wa-015', description: 'Fume Extraction System (Welding + Adhesive)',
    original_amount: 42_000, current_amount: 42_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '8 extraction arms, central filter unit',
    approval_status: 'approved', approval_date: '2026-01-08', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-25', updated_at: '2026-01-08',
  },
  {
    id: 'ci-063', work_area_id: 'wa-015', description: 'Compressed Air System 12bar (Atlas Copco GA55)',
    original_amount: 68_000, current_amount: 68_000,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Atlas Copco Kompressoren', assumptions: '55 kW screw compressor, dryer, 2000L tank',
    approval_status: 'approved', approval_date: '2026-01-12', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-01', updated_at: '2026-01-12',
  },

  // --- WA 16: Safety & Fire Protection — 3 Items ---
  {
    id: 'ci-064', work_area_id: 'wa-016', description: 'Smoke Detection System (Aspirating, Full Hall)',
    original_amount: 48_000, current_amount: 48_000,
    expected_cash_out: '2026-03', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Minimax GmbH', assumptions: 'VESDA aspirating detectors, 4500m² coverage',
    approval_status: 'approved', approval_date: '2025-12-15', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-20', updated_at: '2025-12-15',
  },
  {
    id: 'ci-065', work_area_id: 'wa-016', description: 'Sprinkler System (Wet Pipe, Battery Storage)',
    original_amount: 72_000, current_amount: 75_000,
    expected_cash_out: '2026-05', cost_basis: 'revised_supplier_offer', cost_driver: 'process',
    basis_description: 'Revised offer Minimax GmbH', assumptions: 'FM Global approved, enhanced for Li-ion storage',
    approval_status: 'approved', approval_date: '2026-01-22', project_phase: 'phase_1',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'FM Global required enhanced density', comments: '',
    created_at: '2025-11-08', updated_at: '2026-01-22',
  },
  {
    id: 'ci-066', work_area_id: 'wa-016', description: 'Emergency Lighting & Exit Signage (LED)',
    original_amount: 18_000, current_amount: 18_000,
    expected_cash_out: '2026-03', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: '120 emergency luminaires, 40 exit signs, central battery',
    approval_status: 'approved', approval_date: '2025-12-10', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-15', updated_at: '2025-12-10',
  },

  // --- WA 17: Flooring & Structural — 4 Items ---
  {
    id: 'ci-067', work_area_id: 'wa-017', description: 'ESD Flooring Hall A (Epoxy, 2500m²)',
    original_amount: 95_000, current_amount: 95_000,
    expected_cash_out: '2026-03', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Sika Deutschland', assumptions: 'Conductive epoxy, R < 10⁶Ω, 2500m²',
    approval_status: 'approved', approval_date: '2025-12-18', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-22', updated_at: '2025-12-18',
  },
  {
    id: 'ci-068', work_area_id: 'wa-017', description: 'LED High-Bay Lighting (Assembly + Logistics)',
    original_amount: 55_000, current_amount: 55_000,
    expected_cash_out: '2026-04', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Trilux GmbH', assumptions: '150 luminaires, 500 lux at working height, DALI dimmable',
    approval_status: 'approved', approval_date: '2026-01-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-28', updated_at: '2026-01-05',
  },
  {
    id: 'ci-069', work_area_id: 'wa-017', description: 'Foundation Reinforcement (Press Area)',
    original_amount: 42_000, current_amount: 42_000,
    expected_cash_out: '2026-02', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Structural engineer estimation', assumptions: 'Reinforced concrete pad for 250 kN press',
    approval_status: 'approved', approval_date: '2025-12-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-10', updated_at: '2025-12-05',
  },
  {
    id: 'ci-070', work_area_id: 'wa-017', description: 'Crane Installation (5-ton overhead, 25m span)',
    original_amount: 78_000, current_amount: 82_000,
    expected_cash_out: '2026-06', cost_basis: 'revised_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Revised offer Demag Cranes', assumptions: '5 ton SWL, 25m span, variable speed hoist',
    approval_status: 'pending_supplier_negotiation', approval_date: null, project_phase: 'phase_2',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'Span increased from 20m to 25m', comments: 'Negotiation with Demag ongoing',
    created_at: '2025-11-15', updated_at: '2026-02-25',
  },

  // ============================================================
  // DEPARTMENT 5: Prototyping Lab (~500k budget)
  // ============================================================

  // --- WA 18: CNC & Machining Center — 3 Items ---
  {
    id: 'ci-071', work_area_id: 'wa-018', description: '5-Axis CNC Center DMG Mori CMX 600V',
    original_amount: 185_000, current_amount: 185_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer DMG Mori Deutschland', assumptions: 'Travel 600x560x510mm, 15000 rpm, 24-tool magazine',
    approval_status: 'approved', approval_date: '2026-02-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Long lead item — ordered',
    created_at: '2025-11-01', updated_at: '2026-02-05',
  },
  {
    id: 'ci-072', work_area_id: 'wa-018', description: 'CNC Lathe (Turning Center) Mazak QT-250',
    original_amount: 95_000, current_amount: 95_000,
    expected_cash_out: '2026-08', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Budget estimate from Mazak price list', assumptions: 'Chuck 250mm, bar feeder option',
    approval_status: 'on_hold', approval_date: null, project_phase: 'phase_3',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Deferred — evaluate need in Q3',
    created_at: '2025-12-10', updated_at: '2026-01-15',
  },
  {
    id: 'ci-073', work_area_id: 'wa-018', description: 'Workholding & Fixturing Kit (Modular)',
    original_amount: 15_000, current_amount: 15_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: 'Erwin Halder modular fixturing, 5-axis compatible',
    approval_status: 'approved', approval_date: '2026-01-08', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-05', updated_at: '2026-01-08',
  },

  // --- WA 19: Additive Manufacturing — 3 Items ---
  {
    id: 'ci-074', work_area_id: 'wa-019', description: '3D Printer — EOS M290 Metal (DMLS)',
    original_amount: 120_000, current_amount: 126_000,
    expected_cash_out: '2026-07', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer EOS GmbH', assumptions: 'Build volume 250x250x325mm, AlSi10Mg + Ti6Al4V',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_2',
    product: 'orion', zielanpassung: true, zielanpassung_reason: 'Added titanium powder module', comments: '',
    created_at: '2025-12-01', updated_at: '2026-02-18',
  },
  {
    id: 'ci-075', work_area_id: 'wa-019', description: 'FDM Printer Farm (3x Stratasys F370)',
    original_amount: 42_000, current_amount: 42_000,
    expected_cash_out: '2026-05', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Stratasys GmbH', assumptions: '3 printers, ABS/Nylon/PC, build 355x254x355mm',
    approval_status: 'approved', approval_date: '2026-01-20', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-10', updated_at: '2026-01-20',
  },
  {
    id: 'ci-076', work_area_id: 'wa-019', description: 'Post-Processing Station (Bead Blast + Oven)',
    original_amount: 18_000, current_amount: 18_000,
    expected_cash_out: '2026-06', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: 'Bead blast cabinet + curing oven 300°C',
    approval_status: 'approved', approval_date: '2026-01-15', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-08', updated_at: '2026-01-15',
  },

  // --- WA 20: Metrology & Inspection — 4 Items ---
  {
    id: 'ci-077', work_area_id: 'wa-020', description: 'Coordinate Measuring Machine (Zeiss Contura)',
    original_amount: 145_000, current_amount: 145_000,
    expected_cash_out: '2026-08', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer Carl Zeiss IMT', assumptions: 'Measuring range 900x1200x800mm, scanning probe',
    approval_status: 'pending_technical_clarification', approval_date: null, project_phase: 'phase_2',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: 'Probe head selection TBD',
    created_at: '2025-12-05', updated_at: '2026-02-10',
  },
  {
    id: 'ci-078', work_area_id: 'wa-020', description: 'Optical 3D Scanner (GOM ATOS Q)',
    original_amount: 65_000, current_amount: 68_000,
    expected_cash_out: '2026-06', cost_basis: 'initial_supplier_offer', cost_driver: 'initial_setup',
    basis_description: 'Offer GOM / Zeiss', assumptions: 'Blue light, 12 MP, automated turntable',
    approval_status: 'approved', approval_date: '2026-02-01', project_phase: 'phase_1',
    product: 'overall', zielanpassung: true, zielanpassung_reason: 'Turntable added to scope', comments: '',
    created_at: '2025-11-20', updated_at: '2026-02-01',
  },
  {
    id: 'ci-079', work_area_id: 'wa-020', description: 'Test Fixture Fabrication Bench TFB-2',
    original_amount: 12_000, current_amount: 12_000,
    expected_cash_out: '2026-04', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: 'Heavy-duty bench, vise, drill press, hand tools',
    approval_status: 'approved', approval_date: '2026-01-05', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-10-25', updated_at: '2026-01-05',
  },
  {
    id: 'ci-080', work_area_id: 'wa-020', description: 'Surface Roughness & Hardness Tester Kit',
    original_amount: 8_500, current_amount: 8_500,
    expected_cash_out: '2026-05', cost_basis: 'cost_estimation', cost_driver: 'initial_setup',
    basis_description: 'Internal estimation', assumptions: 'Mitutoyo portable roughness + Leeb hardness tester',
    approval_status: 'approved', approval_date: '2026-01-10', project_phase: 'phase_1',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    created_at: '2025-11-01', updated_at: '2026-01-10',
  },
];

// Attach cost items to work areas
export const mockWorkAreasWithItems: WorkArea[] = mockWorkAreas.map((wa) => ({
  ...wa,
  cost_items: mockCostItems.filter((ci) => ci.work_area_id === wa.id),
}));

// --- Helper: compute sums from items ---

function sumItems(items: CostItem[]): number {
  return items.reduce((s, i) => s + i.current_amount, 0);
}

function itemsForDept(deptId: string): CostItem[] {
  const waIds = mockWorkAreas.filter((wa) => wa.department_id === deptId).map((wa) => wa.id);
  return mockCostItems.filter((ci) => waIds.includes(ci.work_area_id));
}

// --- Budget Summary (computed from items) ---

const totalCurrent = sumItems(mockCostItems);
const totalBudget = mockDepartments.reduce((s, d) => s + d.budget_total, 0);
const totalApproved = sumItems(
  mockCostItems.filter((i) => i.approval_status === 'approved'),
);

export const mockBudgetSummary: BudgetSummary = {
  total_budget: totalBudget,
  total_spent: totalCurrent,
  total_approved: totalApproved,
  total_delta: totalBudget - totalCurrent,
  cost_of_completion: totalCurrent,
};

// --- Department Summaries (computed from items) ---

export const mockDepartmentSummaries: DepartmentSummary[] = mockDepartments.map((dept) => {
  const items = itemsForDept(dept.id);
  const spent = sumItems(items);
  const approved = sumItems(items.filter((i) => i.approval_status === 'approved'));
  return {
    department_name: dept.name,
    budget: dept.budget_total,
    spent,
    approved,
    delta: dept.budget_total - spent,
  };
});

// --- Cash Out Timeline (aggregated from items by month) ---

const months = [
  '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
  '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01',
];

export const mockCashOutEntries: CashOutEntry[] = months.map((month) => ({
  month,
  amount: mockCostItems
    .filter((ci) => ci.expected_cash_out === month)
    .reduce((sum, ci) => sum + ci.current_amount, 0),
}));

// --- Budget Adjustments (Zielanpassungen) ---

export const mockBudgetAdjustments: BudgetAdjustment[] = [
  {
    id: 'ba-001', department_id: 'd-001',
    amount: 80_000,
    reason: 'Produktaenderung CR-2026-042 — zusaetzliche Schweissstation fuer Atlas-Rahmen',
    category: 'product_change',
    created_at: '2026-01-15',
    created_by: 'M. Huber',
  },
  {
    id: 'ba-002', department_id: 'd-001',
    amount: -25_000,
    reason: 'Optimierung Chassis-Vorrichtung — guenstigerer Lieferant',
    category: 'optimization',
    created_at: '2026-02-03',
    created_by: 'G. Weis',
  },
  {
    id: 'ba-003', department_id: 'd-002',
    amount: 120_000,
    reason: 'Scope-Erweiterung NVH-Pruefstand — zusaetzliche Frequenzbereiche gefordert',
    category: 'scope_change',
    created_at: '2026-01-22',
    created_by: 'T. Berger',
  },
  {
    id: 'ba-004', department_id: 'd-002',
    amount: 45_000,
    reason: 'Lieferantenwechsel HV-Testequipment — Keyence statt Hioki',
    category: 'supplier_change',
    created_at: '2026-02-28',
    created_by: 'T. Berger',
  },
  {
    id: 'ba-005', department_id: 'd-003',
    amount: -15_000,
    reason: 'Optimierung AGV-Ladeinfrastruktur — weniger Ladepunkte noetig',
    category: 'optimization',
    created_at: '2026-02-10',
    created_by: 'K. Schmidt',
  },
  {
    id: 'ba-006', department_id: 'd-004',
    amount: 200_000,
    reason: 'Scope-Aenderung Druckluftanlage — hoehere Kapazitaet wegen Orion-Linie',
    category: 'scope_change',
    created_at: '2026-01-30',
    created_by: 'M. Huber',
  },
  {
    id: 'ba-007', department_id: 'd-001',
    amount: 35_000,
    reason: 'Produktaenderung CR-2026-058 — Anpassung Battery-Pack-Vorrichtung fuer Vega',
    category: 'product_change',
    created_at: '2026-03-05',
    created_by: 'G. Weis',
  },
  {
    id: 'ba-008', department_id: 'd-005',
    amount: -10_000,
    reason: 'Sonstiges — Stornierung Prototyping-Werkzeug (nicht mehr benoetigt)',
    category: 'other',
    created_at: '2026-03-12',
    created_by: 'A. Klein',
  },
];

// =========================================================================
// FACILITY 2: 5k Factory — smaller dataset for planning phase
// =========================================================================

export const mockDepartments2: Department[] = [
  { id: 'd-101', facility_id: 'f-002', name: 'Assembly', budget_total: 5_200_000 },
  { id: 'd-102', facility_id: 'f-002', name: 'Testing', budget_total: 2_100_000 },
];

export const mockWorkAreas2: WorkArea[] = [
  { id: 'wa-101', department_id: 'd-101', name: 'Main Assembly Line' },
  { id: 'wa-102', department_id: 'd-101', name: 'Battery Pack Integration' },
  { id: 'wa-103', department_id: 'd-102', name: 'End-of-Line Testing' },
];

export const mockCostItems2: CostItem[] = [
  {
    id: 'ci-101', work_area_id: 'wa-101', description: 'High-Speed Conveyor System HSC-5000',
    original_amount: 520_000, current_amount: 520_000,
    expected_cash_out: '2026-09', cost_basis: 'cost_estimation', cost_driver: 'process',
    basis_description: 'Budget estimate based on 3k Factory scaling',
    assumptions: '5000 units/year, 60m line, servo-driven',
    approval_status: 'open', approval_date: null, project_phase: 'phase_1',
    product: 'atlas', zielanpassung: false, zielanpassung_reason: '',
    comments: 'Pending layout finalization',
    requester: 'Georg Weis', created_at: '2026-02-01', updated_at: '2026-02-01',
  },
  {
    id: 'ci-102', work_area_id: 'wa-101', description: 'Robotic Welding Cell RWC-6 (6-Axis)',
    original_amount: 380_000, current_amount: 395_000,
    expected_cash_out: '2026-10', cost_basis: 'initial_supplier_offer', cost_driver: 'product',
    basis_description: 'Offer ABB Robotics',
    assumptions: '2 robots, welding + inspection, cycle time 90s',
    approval_status: 'submitted_for_approval', approval_date: null, project_phase: 'phase_1',
    product: 'atlas', zielanpassung: true, zielanpassung_reason: 'Added inline vision inspection',
    comments: '', requester: 'Anna Schmidt', created_at: '2026-02-10', updated_at: '2026-03-01',
  },
  {
    id: 'ci-103', work_area_id: 'wa-102', description: 'Battery Module Assembly Station BMA-5K',
    original_amount: 450_000, current_amount: 450_000,
    expected_cash_out: '2026-11', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Scaled from 3k Factory BPF-200',
    assumptions: 'Higher throughput variant, 300 kN press force',
    approval_status: 'open', approval_date: null, project_phase: 'phase_1',
    product: 'vega', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Thomas Mueller', created_at: '2026-02-15', updated_at: '2026-02-15',
  },
  {
    id: 'ci-104', work_area_id: 'wa-103', description: 'EOL Tester 5K-Series (High Volume)',
    original_amount: 480_000, current_amount: 480_000,
    expected_cash_out: '2026-12', cost_basis: 'cost_estimation', cost_driver: 'process',
    basis_description: 'Budget estimate based on Marposs reference',
    assumptions: 'Dual-lane, 120 vehicles/day capacity',
    approval_status: 'open', approval_date: null, project_phase: 'phase_2',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '',
    comments: 'RFQ planned for Q2 2026',
    requester: 'Sophie Klein', created_at: '2026-02-20', updated_at: '2026-02-20',
  },
  {
    id: 'ci-105', work_area_id: 'wa-103', description: 'HV Safety Test Rig HST-5K',
    original_amount: 125_000, current_amount: 125_000,
    expected_cash_out: '2026-12', cost_basis: 'cost_estimation', cost_driver: 'product',
    basis_description: 'Budget estimate from HIOKI catalog',
    assumptions: 'Hipot 5kV, insulation + earth bond',
    approval_status: 'open', approval_date: null, project_phase: 'phase_2',
    product: 'overall', zielanpassung: false, zielanpassung_reason: '', comments: '',
    requester: 'Jan Hoffmann', created_at: '2026-02-20', updated_at: '2026-02-20',
  },
];

export const mockBudgetAdjustments2: BudgetAdjustment[] = [];

// ---------------------------------------------------------------------------
// Per-facility data lookup map
// ---------------------------------------------------------------------------

export type FacilityDataSet = {
  facility: Facility;
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];
  budgetAdjustments: BudgetAdjustment[];
};

export const mockFacilityDataMap: Record<string, FacilityDataSet> = {
  'f-001': {
    facility: mockFacility,
    departments: mockDepartments,
    workAreas: mockWorkAreas,
    costItems: mockCostItems,
    budgetAdjustments: mockBudgetAdjustments,
  },
  'f-002': {
    facility: mockFacility2,
    departments: mockDepartments2,
    workAreas: mockWorkAreas2,
    costItems: mockCostItems2,
    budgetAdjustments: mockBudgetAdjustments2,
  },
};
