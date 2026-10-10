<?php

namespace App\Models\Concerns;

/**
 * The link or file of one submission: the original (a document) or a
 * revision. Needs google_workspace_link, file_path, file_name and typeLabel().
 */
trait HasAttachment
{
    /**
     * Embeddable URL for a Google Workspace link (its /preview form, no API
     * key needed), or null when the link isn't in a recognised shape.
     */
    public function googlePreviewUrl(): ?string
    {
        $link = (string) $this->google_workspace_link;

        // docs.google.com/document/d/ID/edit, drive.google.com/file/d/ID/view, ...
        if (preg_match('#^(https?://(?:docs|drive)\.google\.com/(?:document|spreadsheets|presentation|file)/d/[\w-]+)#', $link, $m)) {
            return $m[1].'/preview';
        }

        // drive.google.com/open?id=ID
        if (preg_match('#^https?://drive\.google\.com/open\?(?:.*&)?id=([\w-]+)#', $link, $m)) {
            return 'https://drive.google.com/file/d/'.$m[1].'/preview';
        }

        return null;
    }

    /**
     * The uploaded file's original name. Uploads saved before names were
     * kept fall back to the document type, e.g. "Policy Draft.pdf".
     */
    public function displayFileName(): string
    {
        return $this->file_name
            ?? $this->typeLabel().'.'.pathinfo((string) $this->file_path, PATHINFO_EXTENSION);
    }
}
