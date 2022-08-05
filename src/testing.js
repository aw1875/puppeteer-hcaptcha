import Jimp from "jimp";

(async () => {
    Jimp.read("https://imgs.hcaptcha.com/9BW4zbRzNsUyShWAsILEpvR3Duwt0NtoeSQyUOLWD1l4goN0Sh1BIs3AowNY36xQnz/g6OrsdLrqJL/pIf1BukwLk4ctlPNcaAWw0xAq6f3Bd/9GkFiehndqDVe4oigkJRVaI6jTuKI+6ysFjhD4j4by2UBQXg==PgW9/RtAAOZy5z6q")
        .then(async (image) => {
            console.log(await image.getBufferAsync(Jimp.MIME_JPEG));
        })
})()
