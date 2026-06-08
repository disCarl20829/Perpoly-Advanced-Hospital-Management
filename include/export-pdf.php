<?php
/**
 * include/pdf-export.php — PDF generation wrapper using TCPDF
 *
 * Usage:
 *   require_once __DIR__ . '/../include/pdf-export.php';
 *   $pdf = new HmsPdf('Appointment Report');
 *   $pdf->addPage();
 *   $pdf->writeHtml('<h2>Title</h2><p>Content…</p>');
 *   $pdf->output('report.pdf');  // streams to browser
 *
 * Requires: vendor/tcpdf/ (included in project)
 * In prototype you can swap TCPDF for mPDF or Dompdf by
 * changing only this file.
 */

// Auto-detect TCPDF location
$tcpdfPath = __DIR__ . '/../assets/vendor/tcpdf/tcpdf.php';
if (!file_exists($tcpdfPath)) {
    // Try Composer path
    $tcpdfPath = __DIR__ . '/../vendor/tecnickcom/tcpdf/tcpdf.php';
}
if (!file_exists($tcpdfPath)) {
    die('PDF Error: TCPDF not found. Run: composer require tecnickcom/tcpdf');
}
require_once $tcpdfPath;

class HmsPdf extends TCPDF
{

    private string $docTitle;

    public function __construct(string $title = 'HMS Report')
    {
        parent::__construct('P', 'mm', 'A4', true, 'UTF-8');
        $this->docTitle = $title;
        $this->SetCreator(APP_NAME);
        $this->SetAuthor(APP_FULL);
        $this->SetTitle($title);
        $this->SetMargins(15, 27, 15);
        $this->SetHeaderMargin(5);
        $this->SetFooterMargin(10);
        $this->SetAutoPageBreak(true, 25);
        $this->setImageScale(PDF_IMAGE_SCALE_RATIO);
    }

    // Custom header with logo + hospital name
    public function Header(): void
    {
        $logoPath = ROOT_PATH . '/assets/images/logo.jpg';
        if (file_exists($logoPath)) {
            $this->Image($logoPath, 15, 5, 12, 12, 'JPG');
        }
        $this->SetFont('helvetica', 'B', 13);
        $this->SetTextColor(30, 77, 123); // --navy
        $this->SetXY(30, 6);
        $this->Cell(0, 8, APP_FULL, 0, false, 'L');
        $this->SetFont('helvetica', '', 9);
        $this->SetTextColor(122, 142, 163); // --gray-500
        $this->SetXY(30, 13);
        $this->Cell(0, 5, $this->docTitle, 0, false, 'L');
        $this->SetXY(-50, 6);
        $this->Cell(35, 8, date('F j, Y'), 0, false, 'R');
        $this->Line(15, 20, 195, 20);
    }

    // Custom footer
    public function Footer(): void
    {
        $this->SetY(-15);
        $this->SetFont('helvetica', 'I', 8);
        $this->SetTextColor(122, 142, 163);
        $this->Cell(0, 10, 'Page ' . $this->getAliasNumPage() . ' of ' . $this->getAliasNbPages(), 0, false, 'C');
    }

    // Convenience: write HTML content
    public function writeHtml($html, $ln = true, $fill = false, $reseth = false, $cell = false, $align = ''): void
    {
        $this->writeHTMLCell(0, 0, '', '', $html, 0, 1, false, true, '', true);
    }

    // Stream PDF to browser for download
    public function output($filename = 'report.pdf', $dest = 'D')
    {
        parent::Output($filename, $dest);
    }

    // Return PDF as string (for email attachment etc.)
    public function toString(): string
    {
        return parent::Output('', 'S');
    }
}

// ── Standalone helper: generate appointment report PDF ────────────────

function exportAppointmentsPdf(array $appointments, string $month): void
{
    $pdf = new HmsPdf('Appointments Report — ' . date('F Y', strtotime($month . '-01')));
    $pdf->AddPage();

    $html = '<style>
        table { border-collapse: collapse; width: 100%; font-size: 10px; }
        th { background-color: #1E4D7B; color: #fff; padding: 5px 8px; text-align: left; }
        td { padding: 4px 8px; border-bottom: 1px solid #DDE3EB; }
        tr:nth-child(even) td { background-color: #EBF3FA; }
        .badge-done    { color: #1E4D7B; } .badge-pending { color: #D68910; }
        .badge-cancel  { color: #C0392B; }
    </style>
    <h3 style="color:#1E4D7B;font-size:13px;margin-bottom:8px">
        Appointment Report &mdash; ' . date('F Y', strtotime($month . '-01')) . '
    </h3>
    <table>
    <tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr>';

    foreach ($appointments as $a) {
        $statusClass = match ($a['status']) {
            'done' => 'badge-done',
            'pending' => 'badge-pending',
            'cancelled' => 'badge-cancel',
            default => '',
        };
        $html .= '<tr>'
            . '<td>' . htmlspecialchars($a['patient_name'] ?? '—') . '</td>'
            . '<td>' . htmlspecialchars($a['doctor_name'] ?? '—') . '</td>'
            . '<td>' . date('M j, Y', strtotime($a['appt_date'])) . '</td>'
            . '<td>' . htmlspecialchars($a['appt_time'] ?? '—') . '</td>'
            . '<td class="' . $statusClass . '">' . ucfirst($a['status']) . '</td>'
            . '</tr>';
    }
    $html .= '</table>';

    $pdf->writeHtml($html);
    $pdf->output('appointments-' . $month . '.pdf');
}