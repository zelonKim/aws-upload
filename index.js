const sharp = require('sharp')
const { S3Client } = require('@aws-sdk/client-s3')

const s3 = new S3Client();

exports.handler = async(event, context, callback) => { // 람다 호출 시 실행되는 함수
    // event에는 호출 상황에 대한 정보가 담김. 
    // context에는 실행되는 함수 환경에 대한 정보가 담김.
    // callback에는 함수가 완료되었는지를 알려줌. (첫번째 인수는 에러 여부를 의미함. / 두번째 인수는 반환값을 의미함.)

    const Bucket = event.Records[0].s3.bucket.name; // event객체로부터 버킷명을 얻어옴.
    const Key = decodeURIComponent(event.Records[0].s3.object.key) // event객체로부터 파일 경로를 얻어옴.
    
    const filename = Key.split('/').at(-1); // 파일경로로부터 파일명을 얻어옴.
    const ext = Key.split('.').at(-1).toLowerCase() // 파일경로로부터 확장자를 얻어옴.

    const requiredFormat = ext === 'jpg' ? 'jpeg' : ext;
    console.log('name', filename, 'ext', ext)

    try {
        const s3Object = await s3.getObejct({ Bucket, Key}) // getObejct메서드를 통해 버킷으로부터 파일객체를 불러옴.
        console.log('original', s3Object.Body.length) // 파일객체.Body에는 파일 버퍼가 담김.

        const resizedImage = await sharp(s3Object.Body) // sharp함수에 파일 버퍼를 넣고, resize메서드로 크기를 지정함.
            .resize(200, 200, { fit: 'inside' }) // 주어진 가로 200, 세로 200 사이즈에 딱 맞도록 이미지를 조정함.
            .toFormat(requiredFormat) // toFormat 메서드를 통해 포맷형식을 지정함.
            .toBuffer(); // toBuffer메서드를 통해 리사이징된 이미지 결과를 버퍼로 출력함.

        await s3.putObject({ // putObject메서드를 통해 리사이즈된 이미지를 해당 Key 폴더에 저장함.
            Bucket,
            Key: `thumb/${filename}`,
            Body: resizedImage,
        })

        console.log('put', resizedImage.length)
        return callback(null, `thumb/${filename}`) // 성공적으로 저장되었을 경우 callback 함수를 통해 람다함수가 종료되었음을 알림. 

    } catch (error) {
        console.error(error)
        return callback(error)
    }
}