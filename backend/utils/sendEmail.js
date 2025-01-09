const nodemailer = require('nodemailer')

exports.connect = () => {
    try {
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: 587,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        return transporter;
    }
    catch (error) {
        console.log("error for sending mail", error);
    }
}