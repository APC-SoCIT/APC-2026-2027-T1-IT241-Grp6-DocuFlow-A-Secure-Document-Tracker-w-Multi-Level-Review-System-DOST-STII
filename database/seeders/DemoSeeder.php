<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\Notification;
use App\Models\Review;
use App\Models\User;
use App\Services\TatService;
use App\Services\WorkflowService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

/**
 * Clean demo data: a few documents at every stage of the review flow, with
 * matching reviews, revisions and notifications on realistic past dates.
 *
 * DESTRUCTIVE: deletes every existing document, notification and upload.
 *   php artisan db:seed --class=DemoSeeder
 */
class DemoSeeder extends Seeder
{
    private User $source;

    private User $l1;

    private User $l1b;

    private User $l2;

    private User $l2b;

    private User $l3;

    public function run(): void
    {
        $this->call(DatabaseSeeder::class);

        Notification::query()->delete();
        Document::query()->delete(); // cascades to revisions and reviews
        Storage::deleteDirectory('documents');

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->l1 = User::where('email', 'l1@docuflow.test')->firstOrFail();     // L1
        $this->l1b = User::where('email', 'l1b@docuflow.test')->firstOrFail();       // second L1
        $this->l2 = User::where('email', 'l2@docuflow.test')->firstOrFail();           // L2
        $this->l2b = User::where('email', 'l2b@docuflow.test')->firstOrFail();  // second L2
        $this->l3 = User::where('email', 'l3@docuflow.test')->firstOrFail();            // L3

        // --- Mostly the first L1 (Sofia) ---------------------------------------

        // 1. Approved after the full chain; each review is slower (TAT 2, 5 and 7 days).
        $doc = $this->submit('Report', ['description' => 'Research outputs across all STII divisions, with recommendations for 2026.'], $this->l1, $this->daysAgo(20), $this->pdf('Annual Research Output Report 2025', [
            'Summary of research outputs across all STII divisions.',
            'Section 1: Publications and citations',
            'Section 2: Technology transfers',
            'Section 3: Recommendations for 2026',
        ]));
        $this->review($doc, $this->l1, 'forward', $this->daysAgo(18), 'Complete and well documented.', $this->l2);
        $this->review($doc, $this->l2, 'endorse', $this->daysAgo(13), 'Endorsed for approval.');
        $this->review($doc, $this->l3, 'approve', $this->daysAgo(6), 'Approved for publication.');

        // 2. Returned by L1, then resubmitted as revision 1: back with the same L1, opened.
        $doc = $this->submit('Other', ['other' => 'Equipment Inventory', 'description' => 'Laboratory equipment on hand as of September 2026.'], $this->l1, $this->daysAgo(7), $this->pdf('Equipment Inventory Summary', [
            'Inventory of laboratory equipment as of September 2026.',
            'Totals per division are listed below.',
        ]));
        $this->review($doc, $this->l1, 'return', $this->daysAgo(5), 'Please add the serial numbers for each item.');
        $this->resubmit($doc, $this->daysAgo(3), 'Added serial numbers for all items.', $this->pdf('Equipment Inventory Summary (rev. 1)', [
            'Inventory of laboratory equipment as of September 2026.',
            'Serial numbers added for every item.',
        ]));
        $this->opened($doc);

        // 3. Pending L2 with Nairb (Excel file).
        $doc = $this->submit('Financial Record', ['description' => 'Proposed purchase of laptops, a printer and a scanner.'], $this->l1, $this->daysAgo(3), $this->xlsx('Budget', [
            ['Item', 'Quantity', 'Unit cost', 'Total'],
            ['Laptop', 2, 45000, 90000],
            ['Printer', 1, 12500, 12500],
            ['Scanner', 1, 18000, 18000],
            ['', '', 'Grand total', 120500],
        ]));
        $this->review($doc, $this->l1, 'forward', $this->daysAgo(2), 'Figures match the purchase requests.', $this->l2);

        // 4. Pending L1 with Sofia, submitted yesterday (New).
        $this->submit('Report', [], $this->l1, $this->daysAgo(1), $this->pdf('Monthly Accomplishment Report: September 2026', [
            'Key accomplishments for the month of September 2026.',
            '1. Completed the user survey for the library portal.',
            '2. Conducted two training sessions on research databases.',
        ]));

        // 5. Submitted by an L2 (Nairb): forwarded by Sofia to the other L2,
        //    endorsed, now with the Division Chief.
        $doc = $this->submit('Project Proposal', ['description' => 'One booking calendar for all laboratory rooms.'], $this->l1, $this->daysAgo(9), $this->pdf('Project Proposal: Shared Lab Booking System', [
            'Objective: one booking calendar for all laboratory rooms.',
            'Budget: PHP 350,000',
        ]), $this->l2);
        $this->review($doc, $this->l1, 'forward', $this->daysAgo(8), 'Clear scope and budget.', $this->l2b);
        $this->review($doc, $this->l2b, 'endorse', $this->daysAgo(4), 'Recommend approval.');

        // --- Mostly the second L1 (Carlo) and second L2 (Beejay) ---------------

        // 6. Approved via the second L1 and L2 (TAT 1, 3 and 5 days).
        $doc = $this->submit('Financial Record', [], $this->l1b, $this->daysAgo(25), $this->xlsx('Q2 Expenses', [
            ['Month', 'Supplies', 'Travel', 'Total'],
            ['April', 18000, 9500, 27500],
            ['May', 21000, 4000, 25000],
            ['June', 16500, 12000, 28500],
        ]));
        $this->review($doc, $this->l1b, 'forward', $this->daysAgo(24), 'Totals reconcile with the ledger.', $this->l2b);
        $this->review($doc, $this->l2b, 'endorse', $this->daysAgo(21), 'Endorsed.');
        $this->review($doc, $this->l3, 'approve', $this->daysAgo(16), 'Approved.');

        // 7. Returned by the Section Head (L2), waiting for the Document Source.
        $doc = $this->submit('Policy Draft', ['description' => 'Retention periods for official records across DOST-STII.'], $this->l1b, $this->daysAgo(9), $this->pdf('Draft Policy: Records Retention', [
            'Purpose: define retention periods for official records.',
            'Scope: all divisions of DOST-STII.',
            'Retention schedule: to follow in the annex.',
        ]));
        $this->review($doc, $this->l1b, 'forward', $this->daysAgo(8), 'Good basis for the policy.', $this->l2b);
        $this->review($doc, $this->l2b, 'return', $this->daysAgo(4), "The annex with the retention schedule is missing.\nPlease attach it and cite the legal basis for each period.");

        // 8. Returned by the Division Chief (L3) after endorsement.
        $doc = $this->submit('Report', [], $this->l1b, $this->daysAgo(15), $this->pdf('Library Usage Report: Q3 2026', [
            'Visits, loans and database sessions for July to September 2026.',
        ]));
        $this->review($doc, $this->l1b, 'forward', $this->daysAgo(14), 'Data is complete.', $this->l2b);
        $this->review($doc, $this->l2b, 'endorse', $this->daysAgo(12), 'Endorsed.');
        $this->review($doc, $this->l3, 'return', $this->daysAgo(10), 'Please compare against Q3 2025 before this goes out.');

        // 9. Pending L2 with Beejay for 7 days: overdue, opened (Ongoing).
        $doc = $this->submit('Policy Draft', ['description' => 'Eligibility, schedules and reporting for remote work.'], $this->l1b, $this->daysAgo(12), $this->pdf('Draft Policy: Remote Work Guidelines', [
            'Eligibility, schedules and reporting for remote work.',
        ]));
        $this->review($doc, $this->l1b, 'forward', $this->daysAgo(7), 'Ready for the Section Head.', $this->l2b);
        $this->opened($doc);

        // 10. Pending L3 with the Division Chief (endorsed by Nairb).
        $doc = $this->submit('Project Proposal', ['description' => 'Digitize 10,000 archival records in 12 months.'], $this->l1b, $this->daysAgo(5), $this->pdf('Project Proposal: Digital Archive Pilot', [
            'Objective: digitize 10,000 archival records in 12 months.',
            'Budget: PHP 1,200,000',
            'Timeline: January to December 2027',
        ]));
        $this->review($doc, $this->l1b, 'forward', $this->daysAgo(4), 'Feasible scope.', $this->l2);
        $this->review($doc, $this->l2, 'endorse', $this->daysAgo(2), 'Recommend approval.');

        // 11. Pending L1 with Carlo for 6 days: overdue (Word file).
        $this->submit('Memo', [], $this->l1b, $this->daysAgo(6), $this->docx('Memorandum: Office Relocation', [
            'To: All STII personnel',
            'Subject: Temporary relocation of the Records Section',
            'The Records Section will move to the 3rd floor from October 15 to October 30.',
            'Please coordinate document requests through the division secretaries.',
        ]));

        // 12. Submitted by an L1 (Sofia) to the other L1; opened (Ongoing).
        $doc = $this->submit('Memo', [], $this->l1b, $this->daysAgo(2), $this->docx('Memorandum: Section A Leave Schedule', [
            'Planned leave for Section A staff, November to December 2026.',
        ]), $this->l1);
        $this->opened($doc);

        // Whoever has to act next (or hear the outcome) has an unread notification.
        foreach (Document::all() as $document) {
            $document->notifications()->latest('id')->first()?->update(['is_read' => false]);
        }
    }

    private function daysAgo(int $days): Carbon
    {
        // Mid-morning Philippine time, so day boundaries are unambiguous.
        return now('Asia/Manila')->subDays($days)->setTime(10, 0)->utc();
    }

    /**
     * @param  array{0: string, 1: string, 2: string}  $file  [contents, extension, original name]
     */
    /**
     * @param  array{description?: string, other?: string}  $details
     */
    private function submit(string $type, array $details, User $l1, Carbon $at, array $file, ?User $submitter = null): Document
    {
        $submitter ??= $this->source;
        [$contents, $extension, $fileName] = $file;
        $path = 'documents/demo-'.Str::random(16).'.'.$extension;
        Storage::put($path, $contents);

        $document = Document::create([
            'reference_number' => app(WorkflowService::class)->nextReferenceNumber($type),
            'description' => $details['description'] ?? null,
            'document_type' => $type,
            'document_type_other' => $details['other'] ?? null,
            'file_path' => $path,
            'file_name' => $fileName,
            'submitted_at' => $at,
            'status' => Document::STATUS_PENDING_L1,
            'review_state' => Document::REVIEW_STATE_NEW,
            'current_review_level' => 1,
            'submitted_by' => $submitter->id,
            'assigned_reviewer_id' => $l1->id,
            'assigned_at' => $at,
        ]);
        $this->stamp($document, $at);

        $this->notify($l1, $document, "{$submitter->name} submitted {$document->reference_number} for your review.", $at);

        return $document;
    }

    /**
     * Mirror ReviewController: save the review with its TAT, move the
     * document on and notify the next person.
     */
    private function review(Document $document, User $reviewer, string $action, Carbon $at, string $remarks, ?User $next = null): void
    {
        $level = $document->current_review_level;
        $tat = app(TatService::class);
        $tatDays = $tat->daysSinceAssignment($document, $at);
        $revision = $document->latestRevision();

        $this->stamp(Review::create([
            'document_id' => $revision ? null : $document->id,
            'revision_id' => $revision?->id,
            'reviewer_id' => $reviewer->id,
            'review_level' => $level,
            'remarks' => $remarks,
            'action' => $action,
            'tat_days' => $tatDays,
        ]), $at);

        $ref = $document->reference_number;

        if ($action === 'return' || $action === 'approve') {
            $document->update([
                'status' => $action === 'return' ? Document::STATUS_RETURNED : Document::STATUS_APPROVED,
                'review_state' => null,
                'assigned_reviewer_id' => null,
                'assigned_at' => null,
            ]);
            $this->notify($document->submitter, $document, $action === 'return'
                ? "{$reviewer->name} returned {$ref} at Level {$level}. Review the remarks and resubmit."
                : "{$reviewer->name} approved {$ref}. Review is complete.", $at);
        } else {
            $next ??= $this->l3; // endorse goes to the one L3
            $nextLevel = $level + 1;
            $document->update([
                'status' => $nextLevel === 2 ? Document::STATUS_PENDING_L2 : Document::STATUS_PENDING_L3,
                'review_state' => Document::REVIEW_STATE_NEW,
                'current_review_level' => $nextLevel,
                'assigned_reviewer_id' => $next->id,
                'assigned_at' => $at,
            ]);
            $verb = $action === 'forward' ? 'forwarded' : 'endorsed';
            $this->notify($next, $document, "{$reviewer->name} {$verb} {$ref} to you for Level {$nextLevel} review.", $at);
        }

        $this->stamp($document, $document->created_at, $at);
    }

    /**
     * Mirror WorkflowService::resubmit: new revision with its own file, back
     * to the same L1. The original file stays on the document.
     *
     * @param  array{0: string, 1: string, 2: string}  $file
     */
    private function resubmit(Document $document, Carbon $at, string $changeNote, array $file): void
    {
        [$contents, $extension, $fileName] = $file;
        $path = 'documents/demo-'.Str::random(16).'.'.$extension;
        Storage::put($path, $contents);

        $l1 = User::findOrFail($document->reviews()->where('review_level', 1)->latest('id')->value('reviewer_id'));
        $revisionNumber = $document->revisions()->count() + 1;

        $this->stamp($document->revisions()->create([
            'revision_number' => $revisionNumber,
            'change_note' => $changeNote,
            'file_path' => $path,
            'file_name' => $fileName,
            'submitted_by' => $document->submitted_by,
        ]), $at);

        $document->update([
            'status' => Document::STATUS_PENDING_L1,
            'review_state' => Document::REVIEW_STATE_NEW,
            'current_review_level' => 1,
            'assigned_reviewer_id' => $l1->id,
            'assigned_at' => $at,
        ]);
        $this->stamp($document, $document->created_at, $at);

        $this->notify($l1, $document, "{$document->submitter->name} resubmitted {$document->reference_number} (revision {$revisionNumber}) for your review.", $at);
    }

    /**
     * The assigned reviewer has opened it (story #27): New becomes Ongoing.
     */
    private function opened(Document $document): void
    {
        $document->forceFill(['review_state' => Document::REVIEW_STATE_ONGOING])->saveQuietly();
    }

    private function notify(User $user, Document $document, string $message, Carbon $at): void
    {
        $this->stamp(Notification::create([
            'user_id' => $user->id,
            'document_id' => $document->id,
            'message' => $message,
            'is_read' => true, // the latest one per document is reopened in run()
        ]), $at);
    }

    private function stamp(Model $model, Carbon $createdAt, ?Carbon $updatedAt = null): Model
    {
        $model->forceFill(['created_at' => $createdAt, 'updated_at' => $updatedAt ?? $createdAt])->saveQuietly();

        return $model;
    }

    /**
     * A one-page PDF with a title and lines of text.
     *
     * @return array{0: string, 1: string, 2: string}
     */
    private function pdf(string $title, array $lines): array
    {
        $escape = fn (string $s) => str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);

        $content = 'BT /F1 18 Tf 72 730 Td ('.$escape($title).") Tj ET\n";
        $y = 696;
        foreach ($lines as $line) {
            $content .= "BT /F1 11 Tf 72 {$y} Td (".$escape($line).") Tj ET\n";
            $y -= 20;
        }

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($content)." >>\nstream\n{$content}endstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n{$object}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n";

        return [$pdf, 'pdf', $this->fileName($title, 'pdf')];
    }

    /**
     * A minimal Word document: a bold title and paragraphs.
     *
     * @return array{0: string, 1: string, 2: string}
     */
    private function docx(string $title, array $paragraphs): array
    {
        $esc = fn (string $s) => htmlspecialchars($s, ENT_XML1);
        $body = '<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>'.$esc($title).'</w:t></w:r></w:p>';
        foreach ($paragraphs as $paragraph) {
            $body .= '<w:p><w:r><w:t xml:space="preserve">'.$esc($paragraph).'</w:t></w:r></w:p>';
        }

        return [$this->zip([
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
            'word/_rels/document.xml.rels' => '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
            'word/document.xml' => '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'.$body.'<w:sectPr/></w:body></w:document>',
        ]), 'docx', $this->fileName($title, 'docx')];
    }

    /**
     * A minimal one-sheet Excel workbook.
     *
     * @return array{0: string, 1: string, 2: string}
     */
    private function xlsx(string $sheetName, array $rows): array
    {
        $esc = fn (string $s) => htmlspecialchars($s, ENT_XML1);
        $sheetRows = '';
        foreach ($rows as $r => $row) {
            $cells = '';
            foreach ($row as $c => $value) {
                $ref = chr(65 + $c).($r + 1);
                $cells .= is_int($value) || is_float($value)
                    ? "<c r=\"{$ref}\"><v>{$value}</v></c>"
                    : "<c r=\"{$ref}\" t=\"inlineStr\"><is><t>".$esc((string) $value).'</t></is></c>';
            }
            $sheetRows .= '<row r="'.($r + 1).'">'.$cells.'</row>';
        }

        return [$this->zip([
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'.$esc($sheetName).'" sheetId="1" r:id="rId1"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
            'xl/worksheets/sheet1.xml' => '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'.$sheetRows.'</sheetData></worksheet>',
        ]), 'xlsx', $this->fileName($sheetName, 'xlsx')];
    }

    /**
     * A readable original file name, e.g. "Draft Policy - Records Retention.pdf".
     */
    private function fileName(string $title, string $extension): string
    {
        return str_replace(':', ' -', $title).'.'.$extension;
    }

    /**
     * @param  array<string, string>  $files
     */
    private function zip(array $files): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'demo');
        $zip = new ZipArchive;
        $zip->open($tmp, ZipArchive::OVERWRITE);
        foreach ($files as $name => $contents) {
            $zip->addFromString($name, $contents);
        }
        $zip->close();

        $bytes = file_get_contents($tmp);
        unlink($tmp);

        return $bytes;
    }
}
