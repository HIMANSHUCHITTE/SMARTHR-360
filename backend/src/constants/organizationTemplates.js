const ORGANIZATION_TYPES = Object.freeze({
    CORPORATE_IT: 'CORPORATE_IT',
    SCHOOL_COLLEGE: 'SCHOOL_COLLEGE',
    HOSPITAL: 'HOSPITAL',
    MANUFACTURING_FACTORY: 'MANUFACTURING_FACTORY',
    GOVERNMENT: 'GOVERNMENT',
    GOVERNMENT_PSU: 'GOVERNMENT_PSU',
    RETAIL_CHAIN: 'RETAIL_CHAIN',
});

const TEMPLATE_MAP = Object.freeze({
    [ORGANIZATION_TYPES.CORPORATE_IT]: {
        type: ORGANIZATION_TYPES.CORPORATE_IT,
        name: 'Corporate / IT Company',
        levels: [
            'Shareholders',
            'Board of Directors',
            'CEO',
            'C-Level Executives',
            'Department Heads',
            'Managers',
            'Team Leads',
            'Employees',
            'Interns',
        ],
        reportingExample: [
            'Board of Directors',
            'CEO',
            'CTO',
            'Engineering Head',
            'Manager',
            'Team Lead',
            'Software Engineer',
        ],
        departments: ['Engineering', 'Product', 'HR', 'Finance', 'Sales', 'IT Operations', 'Legal'],
        roleBehavior: 'KPI and competency driven with optional matrix reporting.',
    },
    [ORGANIZATION_TYPES.SCHOOL_COLLEGE]: {
        type: ORGANIZATION_TYPES.SCHOOL_COLLEGE,
        name: 'School / College',
        levels: [
            'Trust / Chairman',
            'Principal',
            'Vice Principal',
            'HOD',
            'Teachers',
            'Assistant Teachers',
            'Non-Teaching Staff',
        ],
        reportingExample: [
            'Chairman',
            'Principal',
            'Vice Principal',
            'HOD',
            'Teacher',
            'Assistant Teacher',
        ],
        departments: ['Academics', 'Administration', 'Examination', 'Accounts', 'Library', 'Transport'],
        roleBehavior: 'Academic calendar and compliance driven.',
    },
    [ORGANIZATION_TYPES.HOSPITAL]: {
        type: ORGANIZATION_TYPES.HOSPITAL,
        name: 'Hospital',
        levels: [
            'Owner / Board',
            'Medical Director',
            'Department Head',
            'Senior Doctors',
            'Junior Doctors',
            'Nurses',
            'Ward / Support Staff',
        ],
        reportingExample: [
            'Owner / Board',
            'Medical Director',
            'Department Head',
            'Senior Doctor',
            'Junior Doctor',
            'Nurse',
        ],
        departments: ['Clinical', 'Emergency', 'OPD', 'IPD', 'Pharmacy', 'Lab', 'Administration', 'Billing'],
        roleBehavior: 'Dual hierarchy supported: clinical + administrative.',
    },
    [ORGANIZATION_TYPES.MANUFACTURING_FACTORY]: {
        type: ORGANIZATION_TYPES.MANUFACTURING_FACTORY,
        name: 'Manufacturing / Factory',
        levels: [
            'Owner / Board',
            'Plant Head',
            'Production Manager',
            'Shift Supervisor',
            'Line Incharge',
            'Skilled Workers',
            'Contract / Helper Staff',
        ],
        reportingExample: [
            'Owner / Board',
            'Plant Head',
            'Production Manager',
            'Shift Supervisor',
            'Line Incharge',
            'Worker',
        ],
        departments: ['Production', 'Quality', 'Maintenance', 'EHS', 'Warehouse', 'HR'],
        roleBehavior: 'Shift, safety, and line productivity driven.',
    },
    [ORGANIZATION_TYPES.GOVERNMENT_PSU]: {
        type: ORGANIZATION_TYPES.GOVERNMENT_PSU,
        name: 'Government / PSU',
        levels: [
            'Ministry / Authority',
            'Secretary',
            'Director',
            'Officer',
            'Clerk',
            'Field Staff',
        ],
        reportingExample: [
            'Ministry / Authority',
            'Secretary',
            'Director',
            'Officer',
            'Clerk',
            'Field Staff',
        ],
        departments: ['Establishment', 'Accounts', 'Operations', 'Administration', 'Vigilance'],
        roleBehavior: 'Promotion and progression are mostly grade/seniority based.',
    },
    [ORGANIZATION_TYPES.GOVERNMENT]: {
        type: ORGANIZATION_TYPES.GOVERNMENT,
        name: 'Government / PSU',
        levels: [
            'Ministry / Authority',
            'Secretary',
            'Director',
            'Officer',
            'Clerk',
            'Field Staff',
        ],
        reportingExample: [
            'Ministry / Authority',
            'Secretary',
            'Director',
            'Officer',
            'Clerk',
            'Field Staff',
        ],
        departments: ['Establishment', 'Accounts', 'Operations', 'Administration', 'Vigilance'],
        roleBehavior: 'Promotion and progression are mostly grade/seniority based.',
    },
    [ORGANIZATION_TYPES.RETAIL_CHAIN]: {
        type: ORGANIZATION_TYPES.RETAIL_CHAIN,
        name: 'Retail / Chain Business',
        levels: [
            'Corporate Office',
            'Regional Manager',
            'Area Manager',
            'Store Manager',
            'Assistant Manager',
            'Sales Staff',
            'Helper / Inventory Staff',
        ],
        reportingExample: [
            'Corporate Office',
            'Regional Manager',
            'Area Manager',
            'Store Manager',
            'Sales Staff',
        ],
        departments: ['Store Operations', 'Inventory', 'Merchandising', 'Finance', 'HR'],
        roleBehavior: 'Branch target and store performance driven.',
    },
});

const DEFAULT_UNIVERSAL_LEVELS = Object.freeze([
    'Strategic Level (Decision Makers)',
    'Managerial Level (Control & Supervision)',
    'Operational Level (Execution)',
]);

const isValidOrganizationType = (value) => Object.prototype.hasOwnProperty.call(TEMPLATE_MAP, value);

const getOrganizationTemplate = (type) => {
    const key = isValidOrganizationType(type) ? type : ORGANIZATION_TYPES.CORPORATE_IT;
    const template = TEMPLATE_MAP[key];
    return {
        type: template.type,
        name: template.name,
        levels: [...template.levels],
        reportingExample: [...template.reportingExample],
        departments: [...template.departments],
        roleBehavior: template.roleBehavior,
    };
};

const getOrganizationTemplates = () => Object.keys(TEMPLATE_MAP).map((type) => getOrganizationTemplate(type));

module.exports = {
    ORGANIZATION_TYPES,
    DEFAULT_UNIVERSAL_LEVELS,
    getOrganizationTemplate,
    getOrganizationTemplates,
    isValidOrganizationType,
};
