import { RegistrationSession} from './api'


async function main() {
    let s = new RegistrationSession(2023, 'Summer');
    await s.login();
    let r = await s.getRIS();
    console.log(r)
    for (let t of r) {
        console.log(t.start.toLocaleString() + "-" + t.stop.toLocaleString())
    }
}
main();
