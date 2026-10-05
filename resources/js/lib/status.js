// Status labels shown in the UI: the use case documents' exact wording.
// Database values stay snake_case.
export const STATUS_LABELS = {
    pending_l1_review: 'Pending Level 1 Review',
    pending_l2_review: 'Pending Level 2 Review',
    pending_l3_review: 'Pending Level 3 Review',
    returned_to_source: 'Returned to Source',
    approved_complete: 'Approved - Complete',
};

export const ROLE_LABELS = {
    document_source: 'Document Source',
    l1: 'Immediate Supervisor (L1)',
    l2: 'Section Head (L2)',
    l3: 'Division Chief (L3)',
};

export const ROLE_FILTER_LABELS = {
    submitted: 'Submitted by me',
    assigned: 'Assigned to me',
};
