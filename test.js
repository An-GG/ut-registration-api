let { RegistrationSession } = require('./')

async function main() {
    
    let session = new RegistrationSession(2023, 'Spring');
    await session.login();

    let ris = await session.getRIS();

    console.table(ris)

}
main();
