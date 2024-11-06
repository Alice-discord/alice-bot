import text2img from "./text2img.js";
import img2img from "./img2img.js";
import setsysmsg from "./setsysmsg.js";
import setinitprompt from "./setinitprompt.js";
import addsysmsg from "./addsysmsg.js";
import addinitprompt from "./addinitprompt.js";
import resetsysmsg from "./resetsysmsg.js";
import resetinitprompt from "./resetinitprompt.js";
import system from "./system.js";
import initprompt from "./initprompt.js";
import help from "./help.js";
import model from "./model.js";
import ping from "./ping.js";
import describe from "./describe.js";
import upscale from "./upscale.js";
import togglechannel from "./togglechannel.js";
import clear from "./clear.js";
import respond from "./respond.js";
import website from "./website.js";
import togglewelcome from "./togglewelcome.js";
import setwelcomesysmsg from "./setwelcomesysmsg.js";
import support from "./support.js";
import setchannelsettings from  "./setchannelsettings.js"

const commandsArray = [
    setsysmsg, text2img, setinitprompt, addinitprompt,
    addsysmsg, resetsysmsg, resetinitprompt,
    system, initprompt, help, model, ping, img2img,
    describe, upscale, togglechannel, clear,
    respond, website, togglewelcome,
    setwelcomesysmsg,
    support, setchannelsettings];

export default commandsArray;
