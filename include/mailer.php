<?php
// include/mailer.php — Email Notification Helper (prototype: uses mail())
function sendMail(string $to, string $subject, string $body): bool {
    $from    = 'noreply@hospital.local';
    $headers = "From: HMS <$from>\r\nContent-Type: text/html; charset=UTF-8\r\n";
    // Prototype: just log. Replace with PHPMailer/SMTP in production.
    error_log("[MAIL] To:$to Subject:$subject");
    return mail($to, $subject, $body, $headers);
}

function mailAppointmentConfirm(array $apt): void {
    sendMail($apt['patient_email'],
        'Appointment Confirmed — HMS',
        '<p>Your appointment with <strong>'.htmlspecialchars($apt['doctor_name']).'</strong> '
        .'is confirmed for <strong>'.htmlspecialchars($apt['appt_date']).' at '.htmlspecialchars($apt['appt_time']).'</strong>.</p>'
    );
}

function mailPasswordReset(string $email, string $token): void {
    $link = APP_URL . '/reset-password.php?token=' . urlencode($token);
    sendMail($email, 'Reset Your HMS Password',
        '<p>Click <a href="'.$link.'">here</a> to reset your password. Link expires in 1 hour.</p>');
}