<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\Notification;
use App\Models\User;
use App\Services\TatRatingService;
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

    private User $reyes;

    private User $cruz;

    private User $sectionHead;

    private User $divisionChief;

    public function run(): void
    {
        $this->call(DatabaseSeeder::class);

        Notification::query()->delete();
        Document::query()->delete(); // cascades to revisions and reviews
        Storage::deleteDirectory('documents');

        $this->source = User::where('email', 'source@docuflow.test')->firstOrFail();
        $this->reyes = User::where('email', 'l1.reyes@docuflow.test')->firstOrFail();
        $this->cruz = User::where('email', 'l1.cruz@docuflow.test')->firstOrFail();
        $this->sectionHead = User::where('email', 'l2@docuflow.test')->firstOrFail();
        $this->divisionChief = User::where('email', 'l3@docuflow.test')->firstOrFail();

        // 1. Approved after the full chain; slower reviews give ratings 5, 3 and 1.
        $doc = $this->submit('Report', $this->reyes, $this->daysAgo(20), $this->pdf('Annual Research Output Report 2025', [
            'Summary of research outputs across all STII divisions.',
            'Section 1: Publications and citations',
            'Section 2: Technology transfers',
            'Section 3: Recommendations for 2026',
        ]));
        $this->review($doc, $this->reyes, 'forward', $this->daysAgo(18), 'Complete and well documented.', $this->sectionHead);
        $this->review($doc, $this->sectionHead, 'endorse', $this->daysAgo(13), 'Endorsed for approval.');
        $this->review($doc, $this->divisionChief, 'approve', $this->daysAgo(6), 'Approved for publication.');

        // 2. Returned by the Section Head (L2), waiting for the Document Source.
        $doc = $this->submit('Policy Draft', $this->cruz, $this->daysAgo(9), $this->pdf('Draft Policy: Records Retention', [
            'Purpose: define retention periods for official records.',
            'Scope: all divisions of DOST-STII.',
            'Retention schedule: to follow in the annex.',
        ]));
        $this->review($doc, $this->cruz, 'forward', $this->daysAgo(8), 'Good basis for the policy.', $this->sectionHead);
        $this->review($doc, $this->sectionHead, 'return', $this->daysAgo(4), "The annex with the retention schedule is missing.\nPlease attach it and cite the legal basis for each period.");

        // 3. Returned by L1, then resubmitted as revision 2: back with the same L1.
        $doc = $this->submit('Other', $this->reyes, $this->daysAgo(7), $this->pdf('Equipment Inventory Summary', [
            'Inventory of laboratory equipment as of September 2026.',
            'Totals per division are listed below.',
        ]));
        $this->review($doc, $this->reyes, 'return', $this->daysAgo(5), 'Please add the serial numbers for each item.');
        $this->resubmit($doc, $this->daysAgo(3), 'Added serial numbers for all items.', $this->pdf('Equipment Inventory Summary (rev. 2)', [
            'Inventory of laboratory equipment as of September 2026.',
            'Serial numbers added for every item.',
        ]));

        // 4. Pending L3: forwarded and endorsed, waiting for the Division Chief.
        $doc = $this->submit('Project Proposal', $this->cruz, $this->daysAgo(5), $this->pdf('Project Proposal: Digital Archive Pilot', [
            'Objective: digitize 10,000 archival records in 12 months.',
            'Budget: PHP 1,200,000',
            'Timeline: January to December 2027',
        ]));
        $this->review($doc, $this->cruz, 'forward', $this->daysAgo(4), 'Feasible scope.', $this->sectionHead);
        $this->review($doc, $this->sectionHead, 'endorse', $this->daysAgo(2), 'Recommend approval.');

        // 5. Pending L2: forwarded to the Section Head (Excel file).
        $doc = $this->submit('Financial Record', $this->reyes, $this->daysAgo(3), $this->xlsx('Budget', [
            ['Item', 'Quantity', 'Unit cost', 'Total'],
            ['Laptop', 2, 45000, 90000],
            ['Printer', 1, 12500, 12500],
            ['Scanner', 1, 18000, 18000],
            ['', '', 'Grand total', 120500],
        ]));
        $this->review($doc, $this->reyes, 'forward', $this->daysAgo(2), 'Figures match the purchase requests.', $this->sectionHead);

        // 6. Pending L1 for 6 days (overdue: acting now earns a rating of 1). Word file.
        $this->submit('Memo', $this->cruz, $this->daysAgo(6), $this->docx('Memorandum: Office Relocation', [
            'To: All STII personnel',
            'Subject: Temporary relocation of the Records Section',
            'The Records Section will move to the 3rd floor from October 15 to October 30.',
            'Please coordinate document requests through the division secretaries.',
        ]));

        // 7. Pending L1, submitted yesterday.
        $this->submit('Report', $this->reyes, $this->daysAgo(1), $this->pdf('Monthly Accomplishment Report: September 2026', [
            'Key accomplishments for the month of September 2026.',
            '1. Completed the user survey for the library portal.',
            '2. Conducted two training sessions on research databases.',
        ]));

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
     * @param  array{0: string, 1: string}  $file  [contents, extension]
     */
    private function submit(string $type, User $l1, Carbon $at, array $file): Document
    {
        [$contents, $extension] = $file;
        $path = 'documents/demo-'.Str::random(16).'.'.$extension;
        Storage::put($path, $contents);

        $document = Document::create([
            'reference_number' => app(WorkflowService::class)->nextReferenceNumber($type),
            'document_type' => $type,
            'file_path' => $path,
            'submitted_at' => $at,
            'status' => Document::STATUS_PENDING_L1,
            'current_review_level' => 1,
            'submitted_by' => $this->source->id,
            'assigned_reviewer_id' => $l1->id,
            'assigned_at' => $at,
        ]);
        $this->stamp($document, $at);

        $this->stamp($document->revisions()->create([
            'revision_number' => 1,
            'submitted_by' => $this->source->id,
        ]), $at);

        $this->notify($l1, $document, "{$this->source->name} submitted {$document->reference_number} for your review.", $at);

        return $document;
    }

    /**
     * Mirror ReviewController: save the review with TAT/rating, move the
     * document on and notify the next person.
     */
    private function review(Document $document, User $reviewer, string $action, Carbon $at, string $remarks, ?User $next = null): void
    {
        $level = $document->current_review_level;
        $tatRating = app(TatRatingService::class);
        $tatDays = $tatRating->daysSinceAssignment($document, $at);

        $this->stamp($document->reviews()->create([
            'reviewer_id' => $reviewer->id,
            'review_level' => $level,
            // Forward, Endorse and Approve require an assessment; Return doesn't.
            'assessment' => $action === 'return' ? null : 'Complete and consistent with the submission guidelines.',
            'remarks' => $remarks,
            'action' => $action,
            'tat_days' => $tatDays,
            'rating' => $tatRating->ratingFor($tatDays),
        ]), $at);

        $ref = $document->reference_number;

        if ($action === 'return' || $action === 'approve') {
            $document->update([
                'status' => $action === 'return' ? Document::STATUS_RETURNED : Document::STATUS_APPROVED,
                'assigned_reviewer_id' => null,
                'assigned_at' => null,
            ]);
            $this->notify($this->source, $document, $action === 'return'
                ? "{$reviewer->name} returned {$ref} at Level {$level}. Review the remarks and resubmit."
                : "{$reviewer->name} approved {$ref}. Review is complete.", $at);
        } else {
            $next ??= $this->divisionChief; // endorse goes to the one L3
            $nextLevel = $level + 1;
            $document->update([
                'status' => $nextLevel === 2 ? Document::STATUS_PENDING_L2 : Document::STATUS_PENDING_L3,
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
     * Mirror DocumentController::resubmit: new revision, back to the same L1.
     *
     * @param  array{0: string, 1: string}  $file
     */
    private function resubmit(Document $document, Carbon $at, string $changeNote, array $file): void
    {
        [$contents, $extension] = $file;
        Storage::delete($document->file_path);
        $path = 'documents/demo-'.Str::random(16).'.'.$extension;
        Storage::put($path, $contents);

        $l1 = User::findOrFail($document->reviews()->where('review_level', 1)->latest('id')->value('reviewer_id'));
        $revisionNumber = $document->revisions()->max('revision_number') + 1;

        $document->update([
            'file_path' => $path,
            'resubmission_count' => $document->resubmission_count + 1,
            'status' => Document::STATUS_PENDING_L1,
            'current_review_level' => 1,
            'assigned_reviewer_id' => $l1->id,
            'assigned_at' => $at,
        ]);
        $this->stamp($document, $document->created_at, $at);

        $this->stamp($document->revisions()->create([
            'revision_number' => $revisionNumber,
            'change_note' => $changeNote,
            'submitted_by' => $this->source->id,
        ]), $at);

        $this->notify($l1, $document, "{$this->source->name} resubmitted {$document->reference_number} (revision {$revisionNumber}) for your review.", $at);
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
     * @return array{0: string, 1: string}
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

        return [$pdf, 'pdf'];
    }

    /**
     * A minimal Word document: a bold title and paragraphs.
     *
     * @return array{0: string, 1: string}
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
        ]), 'docx'];
    }

    /**
     * A minimal one-sheet Excel workbook.
     *
     * @return array{0: string, 1: string}
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
        ]), 'xlsx'];
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
