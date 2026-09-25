import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  User,
  SanitizedUser,
  Session,
  AuthSession,
  CareerProfile,
  Experience,
  Project,
  Skill,
  Evidence,
  Job,
  FitAnalysis,
  TailoredCV,
  CoverLetter,
  Application,
  BackgroundJob,
  UserCareerLake,
  UserAutomation,
} from '../src/shared/types.js';

export function sanitizeUser(user: User): SanitizedUser {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const DATA_ROOT = path.resolve(process.cwd(), 'data');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

// In-memory sessions store (tokenHash -> Session)
const sessions: Map<string, Session> = new Map();

export class CareerLakeDatabase {
  private usersFile: string;

  constructor() {
    ensureDir(DATA_ROOT);
    this.usersFile = path.join(DATA_ROOT, 'users.json');
    this.initDatabase();
  }

  private getUserDir(userId: string): string {
    const dir = path.join(DATA_ROOT, `user_${userId}`);
    ensureDir(dir);
    return dir;
  }

  private initDatabase(): void {
    const defaultPasswordHash = bcrypt.hashSync('CareerLake@2026', 10);
    let users = readJsonFile<User[]>(this.usersFile, []);
    let updated = false;

    if (users.length === 0) {
      // Seed default demo users
      const userA: User = {
        id: 'usr_alex_costa',
        email: 'alex.costa@industrial-ops.com',
        name: 'Alexandre Costa',
        avatar: 'AC',
        currentRole: 'Senior Project & Cost Controller',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userB: User = {
        id: 'usr_mariana_silva',
        email: 'mariana.silva@biocareer.com',
        name: 'Mariana Silva',
        avatar: 'MS',
        currentRole: 'Biotech & Cosmetic R&I Specialist',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      users = [userA, userB];
      writeJsonFile(this.usersFile, users);
      this.seedUserA(userA.id);
      this.seedUserB(userB.id);
    } else {
      for (const u of users) {
        if (!u.passwordHash) {
          u.passwordHash = defaultPasswordHash;
          u.updatedAt = new Date().toISOString();
          updated = true;
        }
      }
      if (updated) {
        writeJsonFile(this.usersFile, users);
      }
    }

    // Seed automations if not present
    this.seedAutomations('usr_alex_costa', 'usr_mariana_silva');
  }

  private seedAutomations(userAId: string, userBId: string): void {
    const userAAutomations = this.getAutomations(userAId);
    if (userAAutomations.length === 0) {
      const autoA: UserAutomation = {
        id: `auto_${userAId}_nightly`,
        userId: userAId,
        type: 'nightly_fit_analysis',
        enabled: true,
        schedule: {
          frequency: 'daily',
          time: '02:00',
          timezone: 'America/Sao_Paulo',
        },
        nextRunAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.saveAutomation(userAId, autoA);
    }

    const userBAutomations = this.getAutomations(userBId);
    if (userBAutomations.length === 0) {
      const autoB: UserAutomation = {
        id: `auto_${userBId}_audit`,
        userId: userBId,
        type: 'evidence_audit',
        enabled: true,
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 0,
          time: '23:00',
          timezone: 'America/New_York',
        },
        nextRunAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.saveAutomation(userBId, autoB);
    }
  }

  private seedUserA(userId: string): void {
    const lake: UserCareerLake = {
      profile: {
        id: 'prof_alex',
        userId,
        headline: 'Senior Project & Cost Controller | Capex / Opex & Risk Governance',
        summary:
          'Over 12 years of hands-on leadership managing multi-million dollar capital expenditure projects, cost engineering, risk assessment, and executive stakeholder governance in industrial manufacturing and infrastructure.',
        location: 'São Paulo, SP / Remote',
        targetRoles: ['Project Controller Lead', 'Senior Project Manager', 'Head of Project Governance'],
        targetIndustries: ['Industrial Manufacturing', 'Energy', 'Capital Projects', 'Engineering & Construction'],
        languages: [
          { language: 'Portuguese', proficiency: 'Native' },
          { language: 'English', proficiency: 'Full Professional (C1)' },
          { language: 'Spanish', proficiency: 'Working Professional' },
        ],
        education: [
          {
            degree: 'B.S. in Production Engineering',
            institution: 'Escola Politécnica da USP',
            year: '2012',
            field: 'Engineering',
          },
          {
            degree: 'MBA in Financial Management & Project Control',
            institution: 'Fundação Getulio Vargas (FGV)',
            year: '2016',
            field: 'Finance & Governance',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      experiences: [
        {
          id: 'exp_alex_1',
          userId,
          company: 'Nexus Industrial Solutions',
          title: 'Senior Project & Cost Controller',
          startDate: '2020-03',
          isCurrent: true,
          employmentType: 'full-time',
          domain: 'Heavy Industry & Manufacturing',
          location: 'São Paulo, Brazil',
          description:
            'Leading full financial governance, Capex forecasting, and project execution tracking for 5 manufacturing plant modernization initiatives.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exp_alex_2',
          userId,
          company: 'Vanguard EPC Systems',
          title: 'Project Controls & Risk Specialist',
          startDate: '2015-08',
          endDate: '2020-02',
          employmentType: 'full-time',
          domain: 'Capital Projects & EPC',
          location: 'Campinas, Brazil',
          description:
            'Structured project risk management frameworks, baseline schedule control, and subcontractor cost variation audits.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      projects: [
        {
          id: 'proj_alex_1',
          userId,
          experienceId: 'exp_alex_1',
          name: 'Plant Expansion Capex Portfolio ($45M)',
          description:
            'Comprehensive budget control, Primavera schedule integration, and monthly executive C-level risk dashboarding for plant expansion.',
          domain: 'Industrial Automation & Civil Infrastructure',
          scope: '$45M Budget, 18-month duration, 14 subcontracted vendors',
          technologies: ['SAP CO/PS', 'Primavera P6', 'Power BI', 'Monte Carlo Risk Simulation'],
          metrics: 'Delivered 8% under baseline budget ($3.6M saved), 0 fatal HSE incidents, 98% milestone compliance',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'proj_alex_2',
          userId,
          experienceId: 'exp_alex_2',
          name: 'EPC Change Order Governance Framework',
          description:
            'Standardized contract claim review and quantitative dispute resolution workflow for industrial facilities.',
          domain: 'Contract Governance & Dispute Prevention',
          scope: '8 concurrent industrial build contracts',
          technologies: ['SAP PM', 'Excel Financial Modeling', 'Contract Claim Matrix'],
          metrics: 'Prevented $1.2M in ungrounded contractor claims and reduced dispute resolution cycle by 55%',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      skills: [
        { id: 'sk_1', userId, name: 'Project Management', category: 'Functional', proficiency: 'Expert', yearsExperience: 12 },
        { id: 'sk_2', userId, name: 'Cost Control & Engineering', category: 'Functional', proficiency: 'Expert', yearsExperience: 11 },
        { id: 'sk_3', userId, name: 'Risk Analysis & Governance', category: 'Functional', proficiency: 'Expert', yearsExperience: 10 },
        { id: 'sk_4', userId, name: 'C-Level Stakeholder Management', category: 'Leadership', proficiency: 'Expert', yearsExperience: 9 },
        { id: 'sk_5', userId, name: 'Primavera P6', category: 'Tool', proficiency: 'Advanced', yearsExperience: 8 },
        { id: 'sk_6', userId, name: 'SAP PS / CO Modules', category: 'Tool', proficiency: 'Advanced', yearsExperience: 10 },
        { id: 'sk_7', userId, name: 'Contract Negotiations & EPC', category: 'Domain', proficiency: 'Advanced', yearsExperience: 7 },
        { id: 'sk_8', userId, name: 'English (Fluent)', category: 'Language', proficiency: 'Expert', yearsExperience: 12 },
      ],
      evidences: [
        {
          id: 'ev_alex_1',
          userId,
          experienceId: 'exp_alex_1',
          projectId: 'proj_alex_1',
          type: 'direct',
          statement: 'Managed $45M Capex portfolio across industrial facilities, delivering 8% cost savings ($3.6M) under baseline.',
          metric: '8% cost reduction ($3.6M saved on $45M budget)',
          source: 'Audited Financial Close & Executive Steering Committee Report',
          confidence: 'high',
          domainTag: 'Cost Control',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ev_alex_2',
          userId,
          experienceId: 'exp_alex_1',
          projectId: 'proj_alex_1',
          type: 'direct',
          statement: 'Maintained weekly and monthly project governance cadence with CEO, CFO, and Site Operations Directors.',
          metric: '100% C-suite steering committee attendance and approval record',
          source: 'Executive Steering Committee Minutes & Signed Approvals',
          confidence: 'high',
          domainTag: 'Stakeholder Governance',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ev_alex_3',
          userId,
          experienceId: 'exp_alex_2',
          projectId: 'proj_alex_2',
          type: 'direct',
          statement: 'Implemented standardized contract dispute and risk mitigation framework, eliminating $1.2M in vendor overcharges.',
          metric: '$1.2M contractor claims dismissed and 55% faster dispute resolution',
          source: 'Contract Audit & Legal Sign-off',
          confidence: 'high',
          domainTag: 'Risk Management',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ev_alex_4',
          userId,
          experienceId: 'exp_alex_1',
          type: 'transferable',
          statement: 'Coordinated complex cross-functional product development pipelines and equipment commissioning involving 18 engineers.',
          metric: '18 cross-functional team members led, 0 critical schedule slips',
          source: 'Annual Performance Appraisal',
          confidence: 'high',
          domainTag: 'Cross-functional Leadership',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    this.saveUserLake(userId, lake);

    // Seed sample job and analysis for Alex
    const sampleJob: Job = {
      id: 'job_alex_industrial_lead',
      userId,
      company: 'Aura Industrial Tech',
      title: 'Global Project & Capex Controls Manager',
      location: 'São Paulo, SP (Hybrid)',
      seniority: 'Lead / Principal',
      employmentType: 'Full-time',
      description:
        'Seeking an experienced Project & Capex Controls Manager to lead global manufacturing facility modernizations. Responsible for $50M+ Capex portfolios, Primavera schedule integration, cost engineering, risk registers, and cross-functional C-level steering committees.',
      requirements: [
        {
          requirementId: 'req_1',
          category: 'Functional',
          description: 'Multi-million dollar Capex & Opex budget control and variance analysis',
          importance: 'critical',
          evidenceRequired: 'Direct evidence of managing $20M+ project budgets',
        },
        {
          requirementId: 'req_2',
          category: 'Functional',
          description: 'Formal risk mitigation frameworks, quantitative risk simulation, and contingency control',
          importance: 'critical',
          evidenceRequired: 'Track record in project risk registers and mitigation',
        },
        {
          requirementId: 'req_3',
          category: 'Stakeholder',
          description: 'Direct reporting and alignment with C-suite stakeholders (CFO, VP of Operations)',
          importance: 'high',
          evidenceRequired: 'Proof of steering committee leadership',
        },
        {
          requirementId: 'req_4',
          category: 'Tool',
          description: 'Advanced proficiency in SAP PS/CO and Primavera P6',
          importance: 'high',
          evidenceRequired: 'Practical enterprise implementation experience',
        },
      ],
      rawText: 'Seeking an experienced Project & Capex Controls Manager...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveJob(userId, sampleJob);

    // Pre-create initial application
    const application: Application = {
      id: 'app_alex_aura',
      userId,
      jobId: sampleJob.id,
      jobTitle: sampleJob.title,
      company: sampleJob.company,
      status: 'Ready to Apply',
      appliedAt: undefined,
      notes: 'Strong match on Capex & Risk governance. Need tailored CV emphasizing SAP PS & $45M portfolio.',
      salaryTarget: 'R$ 28.000 - R$ 32.000 / month',
      timeline: [
        {
          status: 'Saved',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          note: 'Job imported from LinkedIn',
        },
        {
          status: 'Analyzing',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          note: 'Deep evidence mapping performed',
        },
        {
          status: 'Ready to Apply',
          timestamp: new Date().toISOString(),
          note: 'Tailored CV generated in Balanced mode',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveApplication(userId, application);
  }

  private seedUserB(userId: string): void {
    const lake: UserCareerLake = {
      profile: {
        id: 'prof_mariana',
        userId,
        headline: 'Biotech & Cosmetic R&I Specialist | Formulation & Packaging Stability',
        summary:
          '8+ years in cosmetic chemistry and biotech R&I. Specializing in skincare emulsion formulation, primary packaging validation, ISO 22716 / GMP audits, and regulatory dossiers with ANVISA and international health authorities.',
        location: 'Campinas, SP / Hybrid',
        targetRoles: ['Cosmetic R&I Manager', 'Formulation Specialist Lead', 'Quality Assurance & Regulatory Head'],
        targetIndustries: ['Cosmetics & Personal Care', 'Biotech', 'Pharmaceuticals', 'Dermocosmetics'],
        languages: [
          { language: 'Portuguese', proficiency: 'Native' },
          { language: 'English', proficiency: 'Fluent (C1)' },
          { language: 'French', proficiency: 'Intermediate' },
        ],
        education: [
          {
            degree: 'B.S. in Pharmacy & Biochemical Sciences',
            institution: 'UNICAMP',
            year: '2016',
            field: 'Pharmaceutical Sciences & Chemistry',
          },
          {
            degree: 'Postgraduate in Dermocosmetic Formulation',
            institution: 'Faculdade Oswaldo Cruz',
            year: '2018',
            field: 'Cosmetology',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      experiences: [
        {
          id: 'exp_mariana_1',
          userId,
          company: 'Lumière BioCosmetics Lab',
          title: 'Lead Formulation & Packaging Scientist',
          startDate: '2021-01',
          isCurrent: true,
          employmentType: 'full-time',
          domain: 'Cosmetics & Personal Care R&I',
          location: 'Campinas, SP',
          description:
            'Leading the formulation development pipeline for clean-beauty skincare, surfactant systems, and packaging compatibility testing.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'exp_mariana_2',
          userId,
          company: 'DermaHealth Pharma',
          title: 'Quality & Regulatory Analyst',
          startDate: '2017-02',
          endDate: '2020-12',
          employmentType: 'full-time',
          domain: 'Pharmaceutical & Dermocosmetic QA',
          location: 'São Paulo, SP',
          description:
            'Maintained GMP compliance, analytical stability testing, and regulatory notification filings for topical products.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      projects: [
        {
          id: 'proj_mariana_1',
          userId,
          experienceId: 'exp_mariana_1',
          name: 'Clean Beauty Anti-Aging Emulsion Line',
          description:
            'Formulated stable water-in-oil and oil-in-water emulsions using natural biomimetic emulsifiers and peptide complexes.',
          domain: 'Cosmetic Formulation & Rheology',
          scope: '6 SKU product line launch across Latin America',
          technologies: ['Rheometer', 'High-Shear Homogenizer', 'HPLC', 'Accelerated Stability Chambers'],
          metrics: 'Passed 90-day accelerated stability (45°C/75% RH) with 0 phase separation; approved for mass retail rollout',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'proj_mariana_2',
          userId,
          experienceId: 'exp_mariana_1',
          name: 'Primary Packaging Compatibility & Leakage Minimization',
          description:
            'Evaluated pump dispenser mechanisms, airless bottles, and PCR-PET resins for formula interactions, torque seal, and drop resistance.',
          domain: 'Packaging Engineering & Materials Validation',
          scope: '1.2M production unit batch validation',
          technologies: ['Vacuum Leak Tester', 'Torque Meter', 'FTIR Spectroscopy'],
          metrics: 'Reduced in-transit leakage defect rate from 1.8% to 0.02%, saving R$ 420K in returns',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      skills: [
        { id: 'sk_m1', userId, name: 'Cosmetic Formulation', category: 'Domain', proficiency: 'Expert', yearsExperience: 8 },
        { id: 'sk_m2', userId, name: 'Packaging Stability & Validation', category: 'Technical', proficiency: 'Expert', yearsExperience: 7 },
        { id: 'sk_m3', userId, name: 'ISO 22716 & Good Manufacturing Practices (GMP)', category: 'Functional', proficiency: 'Advanced', yearsExperience: 8 },
        { id: 'sk_m4', userId, name: 'Regulatory Dossiers (ANVISA / FDA)', category: 'Domain', proficiency: 'Advanced', yearsExperience: 6 },
        { id: 'sk_m5', userId, name: 'Rheology & Emulsion Chemistry', category: 'Technical', proficiency: 'Expert', yearsExperience: 8 },
        { id: 'sk_m6', userId, name: 'Microbiological Challenge Testing (PET)', category: 'Technical', proficiency: 'Competent', yearsExperience: 5 },
      ],
      evidences: [
        {
          id: 'ev_m_1',
          userId,
          experienceId: 'exp_mariana_1',
          projectId: 'proj_mariana_1',
          type: 'direct',
          statement: 'Formulated 14 commercial skincare and hair cosmetic formulas meeting stability specifications for Latin American launch.',
          metric: '14 successful commercial SKUs launched, 100% stability pass rate',
          source: 'Laboratory Formula Master Batch Records',
          confidence: 'high',
          domainTag: 'Cosmetic Formulation',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ev_m_2',
          userId,
          experienceId: 'exp_mariana_1',
          projectId: 'proj_mariana_2',
          type: 'direct',
          statement: 'Validated primary packaging compatibility (airless bottles, pumps, PCR resins) reducing leakage defects to 0.02%.',
          metric: 'Defect rate dropped from 1.8% to 0.02% (R$ 420K savings)',
          source: 'QA Quality Release Certificate & Transport Simulation Report',
          confidence: 'high',
          domainTag: 'Packaging Validation',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'ev_m_3',
          userId,
          experienceId: 'exp_mariana_2',
          type: 'direct',
          statement: 'Prepared and submitted 35+ ANVISA cosmetic product notifications with zero regulatory rejections.',
          metric: '35+ ANVISA dossier notifications with 100% first-pass acceptance',
          source: 'Regulatory Affairs Official Logbook',
          confidence: 'high',
          domainTag: 'Regulatory Compliance',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    this.saveUserLake(userId, lake);
  }

  // --- User & Auth Methods ---
  public getUsers(): User[] {
    return readJsonFile<User[]>(this.usersFile, []);
  }

  public getUserById(userId: string): User | null {
    const users = this.getUsers();
    return users.find((u) => u.id === userId) || null;
  }

  public getUserByEmail(email: string): User | null {
    const users = this.getUsers();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public createUser(email: string, name: string, passwordHash?: string, currentRole: string = 'Professional'): User {
    const users = this.getUsers();
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const now = new Date().toISOString();
    const newUser: User = {
      id,
      email: email.trim().toLowerCase(),
      name,
      avatar: initials || 'CL',
      currentRole,
      passwordHash: passwordHash || bcrypt.hashSync('CareerLake@2026', 10),
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    writeJsonFile(this.usersFile, users);

    // Initialize empty career lake
    const initialLake: UserCareerLake = {
      profile: {
        id: `prof_${id}`,
        userId: id,
        headline: currentRole,
        summary: `Career history and professional records for ${name}.`,
        location: 'São Paulo, Brazil',
        targetRoles: [currentRole],
        targetIndustries: ['General'],
        languages: [{ language: 'Portuguese', proficiency: 'Native' }],
        education: [],
        createdAt: now,
        updatedAt: now,
      },
      experiences: [],
      projects: [],
      skills: [],
      evidences: [],
    };
    this.saveUserLake(id, initialLake);

    return newUser;
  }

  public createSession(userId: string): AuthSession {
    const user = this.getUserById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const rawToken = `sess_${userId}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = hashToken(rawToken);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86400000 * 30).toISOString();

    const storedSession: Session = {
      id: `sid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      tokenHash,
      createdAt: now,
      expiresAt,
    };

    sessions.set(tokenHash, storedSession);

    return {
      token: rawToken,
      userId,
      user: sanitizeUser(user),
      expiresAt,
    };
  }

  public getSession(token: string): AuthSession | null {
    if (!token) return null;
    const tokenHash = hashToken(token);
    const sess = sessions.get(tokenHash);
    if (!sess) return null;
    if (sess.revokedAt || new Date(sess.expiresAt).getTime() < Date.now()) {
      sessions.delete(tokenHash);
      return null;
    }

    const user = this.getUserById(sess.userId);
    if (!user) return null;

    return {
      token,
      userId: sess.userId,
      user: sanitizeUser(user),
      expiresAt: sess.expiresAt,
    };
  }

  public revokeSession(token: string): void {
    if (!token) return;
    const tokenHash = hashToken(token);
    const sess = sessions.get(tokenHash);
    if (sess) {
      sess.revokedAt = new Date().toISOString();
      sessions.delete(tokenHash);
    }
  }

  // --- Career Lake Isolated Operations ---
  public getUserLake(userId: string): UserCareerLake {
    const lakeFile = path.join(this.getUserDir(userId), 'lake.json');
    return readJsonFile<UserCareerLake>(lakeFile, {
      profile: {
        id: `prof_${userId}`,
        userId,
        headline: '',
        summary: '',
        location: '',
        targetRoles: [],
        targetIndustries: [],
        languages: [],
        education: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      experiences: [],
      projects: [],
      skills: [],
      evidences: [],
    });
  }

  public saveUserLake(userId: string, lake: UserCareerLake): void {
    const lakeFile = path.join(this.getUserDir(userId), 'lake.json');
    writeJsonFile(lakeFile, lake);
  }

  public addExperience(userId: string, exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Experience {
    const lake = this.getUserLake(userId);
    const newExp: Experience = {
      ...exp,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    lake.experiences.unshift(newExp);
    this.saveUserLake(userId, lake);
    return newExp;
  }

  public addProject(userId: string, proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Project {
    const lake = this.getUserLake(userId);
    const newProj: Project = {
      ...proj,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    lake.projects.unshift(newProj);
    this.saveUserLake(userId, lake);
    return newProj;
  }

  public addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Skill {
    const lake = this.getUserLake(userId);
    const newSkill: Skill = {
      ...skill,
      id: `sk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
    };
    lake.skills.push(newSkill);
    this.saveUserLake(userId, lake);
    return newSkill;
  }

  public addEvidence(userId: string, evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>): Evidence {
    const lake = this.getUserLake(userId);
    const newEv: Evidence = {
      ...evidence,
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: new Date().toISOString(),
    };
    lake.evidences.unshift(newEv);
    this.saveUserLake(userId, lake);
    return newEv;
  }

  public updateProfile(userId: string, updates: Partial<CareerProfile>): CareerProfile {
    const lake = this.getUserLake(userId);
    lake.profile = {
      ...lake.profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveUserLake(userId, lake);
    return lake.profile;
  }

  // --- Jobs Isolated Operations ---
  public getJobs(userId: string): Job[] {
    const jobsFile = path.join(this.getUserDir(userId), 'jobs.json');
    return readJsonFile<Job[]>(jobsFile, []);
  }

  public getJobById(userId: string, jobId: string): Job | null {
    const jobs = this.getJobs(userId);
    return jobs.find((j) => j.id === jobId && j.userId === userId) || null;
  }

  public saveJob(userId: string, job: Job): void {
    const jobsFile = path.join(this.getUserDir(userId), 'jobs.json');
    const jobs = readJsonFile<Job[]>(jobsFile, []);
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobs[idx] = { ...job, userId, updatedAt: new Date().toISOString() };
    } else {
      jobs.unshift({ ...job, userId });
    }
    writeJsonFile(jobsFile, jobs);
  }

  public deleteJob(userId: string, jobId: string): boolean {
    const jobsFile = path.join(this.getUserDir(userId), 'jobs.json');
    const jobs = readJsonFile<Job[]>(jobsFile, []);
    const filtered = jobs.filter((j) => !(j.id === jobId && j.userId === userId));
    if (filtered.length !== jobs.length) {
      writeJsonFile(jobsFile, filtered);
      return true;
    }
    return false;
  }

  // --- Fit Analyses Isolated Operations ---
  public getAnalyses(userId: string): FitAnalysis[] {
    const file = path.join(this.getUserDir(userId), 'analyses.json');
    return readJsonFile<FitAnalysis[]>(file, []);
  }

  public getAnalysisByJobId(userId: string, jobId: string): FitAnalysis | null {
    const list = this.getAnalyses(userId);
    return list.find((a) => a.jobId === jobId && a.userId === userId) || null;
  }

  public saveAnalysis(userId: string, analysis: FitAnalysis): void {
    const file = path.join(this.getUserDir(userId), 'analyses.json');
    const list = readJsonFile<FitAnalysis[]>(file, []);
    const idx = list.findIndex((a) => a.jobId === analysis.jobId);
    if (idx >= 0) {
      list[idx] = { ...analysis, userId };
    } else {
      list.unshift({ ...analysis, userId });
    }
    writeJsonFile(file, list);
  }

  // --- Tailored Documents Isolated Operations ---
  public getCVs(userId: string): TailoredCV[] {
    const file = path.join(this.getUserDir(userId), 'cvs.json');
    return readJsonFile<TailoredCV[]>(file, []);
  }

  public getCVByJobId(userId: string, jobId: string): TailoredCV | null {
    const list = this.getCVs(userId);
    return list.find((c) => c.jobId === jobId && c.userId === userId) || null;
  }

  public saveCV(userId: string, cv: TailoredCV): void {
    const file = path.join(this.getUserDir(userId), 'cvs.json');
    const list = readJsonFile<TailoredCV[]>(file, []);
    const idx = list.findIndex((c) => c.jobId === cv.jobId && c.mode === cv.mode);
    if (idx >= 0) {
      list[idx] = { ...cv, userId };
    } else {
      list.unshift({ ...cv, userId });
    }
    writeJsonFile(file, list);
  }

  public getCoverLetters(userId: string): CoverLetter[] {
    const file = path.join(this.getUserDir(userId), 'cover_letters.json');
    return readJsonFile<CoverLetter[]>(file, []);
  }

  public saveCoverLetter(userId: string, letter: CoverLetter): void {
    const file = path.join(this.getUserDir(userId), 'cover_letters.json');
    const list = readJsonFile<CoverLetter[]>(file, []);
    const idx = list.findIndex((l) => l.jobId === letter.jobId);
    if (idx >= 0) {
      list[idx] = { ...letter, userId };
    } else {
      list.unshift({ ...letter, userId });
    }
    writeJsonFile(file, list);
  }

  // --- Applications Isolated Operations ---
  public getApplications(userId: string): Application[] {
    const file = path.join(this.getUserDir(userId), 'applications.json');
    return readJsonFile<Application[]>(file, []);
  }

  public getApplicationById(userId: string, id: string): Application | null {
    const list = this.getApplications(userId);
    return list.find((a) => a.id === id && a.userId === userId) || null;
  }

  public saveApplication(userId: string, app: Application): void {
    const file = path.join(this.getUserDir(userId), 'applications.json');
    const list = readJsonFile<Application[]>(file, []);
    const idx = list.findIndex((a) => a.id === app.id);
    if (idx >= 0) {
      list[idx] = { ...app, userId, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...app, userId });
    }
    writeJsonFile(file, list);
  }

  public deleteApplication(userId: string, id: string): boolean {
    const file = path.join(this.getUserDir(userId), 'applications.json');
    const list = readJsonFile<Application[]>(file, []);
    const filtered = list.filter((a) => !(a.id === id && a.userId === userId));
    if (filtered.length !== list.length) {
      writeJsonFile(file, filtered);
      return true;
    }
    return false;
  }

  // --- Background Jobs Isolated Operations ---
  public getBackgroundJobs(userId: string): BackgroundJob[] {
    const file = path.join(this.getUserDir(userId), 'background_jobs.json');
    return readJsonFile<BackgroundJob[]>(file, []);
  }

  public getAllPendingJobs(): BackgroundJob[] {
    // Collect from all user directories for the central worker scheduler
    const allUsers = this.getUsers();
    const pending: BackgroundJob[] = [];
    for (const u of allUsers) {
      const userJobs = this.getBackgroundJobs(u.id);
      for (const j of userJobs) {
        if (j.status === 'pending' || j.status === 'queued') {
          pending.push(j);
        }
      }
    }
    return pending;
  }

  public saveBackgroundJob(userId: string, job: BackgroundJob): void {
    const file = path.join(this.getUserDir(userId), 'background_jobs.json');
    const list = readJsonFile<BackgroundJob[]>(file, []);
    const idx = list.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      list[idx] = { ...job, userId, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...job, userId });
    }
    writeJsonFile(file, list);
  }
  // --- Automations Isolated Operations ---
  public getAutomations(userId: string): UserAutomation[] {
    const file = path.join(this.getUserDir(userId), 'automations.json');
    return readJsonFile<UserAutomation[]>(file, []);
  }

  public getAutomationById(userId: string, id: string): UserAutomation | null {
    const list = this.getAutomations(userId);
    return list.find((a) => a.id === id && a.userId === userId) || null;
  }

  public saveAutomation(userId: string, automation: UserAutomation): void {
    const file = path.join(this.getUserDir(userId), 'automations.json');
    const list = readJsonFile<UserAutomation[]>(file, []);
    const idx = list.findIndex((a) => a.id === automation.id);
    if (idx >= 0) {
      list[idx] = { ...automation, userId, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...automation, userId });
    }
    writeJsonFile(file, list);
  }

  public deleteAutomation(userId: string, id: string): boolean {
    const file = path.join(this.getUserDir(userId), 'automations.json');
    const list = readJsonFile<UserAutomation[]>(file, []);
    const filtered = list.filter((a) => !(a.id === id && a.userId === userId));
    if (filtered.length !== list.length) {
      writeJsonFile(file, filtered);
      return true;
    }
    return false;
  }

  public getAllActiveAutomations(): UserAutomation[] {
    const allUsers = this.getUsers();
    const active: UserAutomation[] = [];
    for (const u of allUsers) {
      const userAutomations = this.getAutomations(u.id);
      for (const a of userAutomations) {
        if (a.enabled) {
          active.push(a);
        }
      }
    }
    return active;
  }
}

export const db = new CareerLakeDatabase();
