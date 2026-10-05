import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
    BanknoteIcon,
    FileChartColumnIcon,
    FileQuestionIcon,
    LightbulbIcon,
    MailIcon,
    ScrollTextIcon,
} from 'lucide-react';

const TYPE_ICONS = {
    Report: FileChartColumnIcon,
    'Policy Draft': ScrollTextIcon,
    'Financial Record': BanknoteIcon,
    'Project Proposal': LightbulbIcon,
    Memo: MailIcon,
    Other: FileQuestionIcon,
};

// Props for SelectContent so every dropdown opens below its field, at its width.
export const dropdownProps = {
    position: 'popper',
    sideOffset: 4,
    className: 'p-1',
};

// Roomier rows than the default, with space for an icon or avatar.
export const optionClassName = 'min-h-9 gap-2.5 rounded-md py-1.5 pl-2';

export function DocumentTypeOption({ type }) {
    const Icon = TYPE_ICONS[type] ?? FileQuestionIcon;

    return (
        <span className="flex items-center gap-2.5">
            <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
            {type}
        </span>
    );
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

export function ReviewerOption({ name }) {
    return (
        <span className="flex items-center gap-2.5">
            <Avatar className="size-5 rounded-full">
                <AvatarFallback className="bg-muted text-[9px] font-semibold">{initials(name)}</AvatarFallback>
            </Avatar>
            {name}
        </span>
    );
}
