<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Notification;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_data_covers_every_stage_with_valid_files(): void
    {
        Storage::fake();

        $this->seed(DemoSeeder::class);

        $this->assertSame([
            'approved_complete' => 1,
            'pending_l1_review' => 3,
            'pending_l2_review' => 1,
            'pending_l3_review' => 1,
            'returned_to_source' => 1,
        ], Document::query()->orderBy('status')->get()->countBy('status')->all());

        // Ratings on the approved document: 2, 5 and 7 days -> 5, 3, 1.
        $approved = Document::where('status', Document::STATUS_APPROVED)->firstOrFail();
        $this->assertSame([5, 3, 1], $approved->reviews()->orderBy('id')->pluck('rating')->all());

        // The resubmitted document is on revision 2, back with its original L1.
        $resubmitted = Document::whereHas('revisions', fn ($q) => $q->where('revision_number', 2))->firstOrFail();
        $this->assertSame('pending_l1_review', $resubmitted->status);
        $this->assertSame(1, $resubmitted->resubmission_count);
        $this->assertTrue($resubmitted->submitted_at->lt($resubmitted->revisions()->where('revision_number', 2)->value('created_at')));
        $this->assertSame(0, Document::whereNull('submitted_at')->count());
        $this->assertSame(
            $resubmitted->reviews()->where('review_level', 1)->value('reviewer_id'),
            $resubmitted->assigned_reviewer_id,
        );

        // Every document has a stored, well-formed file.
        foreach (Document::all() as $document) {
            Storage::assertExists($document->file_path);
            $bytes = Storage::get($document->file_path);
            $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);

            if ($extension === 'pdf') {
                $this->assertStringStartsWith('%PDF-', $bytes);
            } else {
                $tmp = tempnam(sys_get_temp_dir(), 'zip');
                file_put_contents($tmp, $bytes);
                $zip = new ZipArchive;
                $this->assertTrue($zip->open($tmp) === true, "{$document->reference_number} is a valid zip");
                $this->assertNotFalse($zip->locateName($extension === 'docx' ? 'word/document.xml' : 'xl/worksheets/sheet1.xml'));
                $zip->close();
                unlink($tmp);
            }
        }

        // Whoever has to act next on each document has an unread notification for it.
        foreach (Document::all() as $document) {
            $nextPerson = $document->assigned_reviewer_id ?? $document->submitted_by;
            $this->assertTrue(
                Notification::where('document_id', $document->id)->where('user_id', $nextPerson)->where('is_read', false)->exists(),
                "{$document->reference_number} has an unread notification for whoever acts next",
            );
        }
        $this->assertSame(7, Notification::where('is_read', false)->count());

        // Running it again starts clean instead of piling up.
        $this->seed(DemoSeeder::class);
        $this->assertSame(7, Document::count());
    }
}
