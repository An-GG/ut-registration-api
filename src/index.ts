import { RegistrationSession} from './api'


async function main() {
    let s = new RegistrationSession(2023, 'Spring');
    await s.login();
    let r = await s.getRIS();
    let a = await s.getClassListing();
    console.log(a);
}
main();
