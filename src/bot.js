/* eslint-disable */
/* @ts-nocheck */
import {
    createRequire
} from "module";
const require = createRequire(import.meta.url);
import {
    Client,
    Events,
    GatewayIntentBits,
    MessageType,
    Partials,
    REST,
    Routes,
    ChannelType,
    PermissionsBitField,
    ActivityType,
    fetchRecommendedShardCount,
    AttachmentBuilder
} from "discord.js";
import {
    LogLevel
} from "meklog";
import dotenv from "dotenv";
import axios from "axios";
import commands from "./commands/commands.js";

// Enviorment variables
const welcomeuser = getBoolean(process.env.SENDWELCOMEMESSAGE);
const servers = process.env.OLLAMA.split(",").map(url => ({
    url: new URL(url),
    available: true
}));
const FluxServers = process.env.WEBUIFORGE.split(",").map(url => ({
    url: new URL(url),
    available: true
}));
const randomServer = getBoolean(process.env.RANDOM_SERVER);
var model = process.env.MODEL;
var imagemodel = process.env.IMAGEMODEL;
var embedmodel = process.env.EMBEDDINGMODEL;
var BLOCKED_PHRASES = process.env.BLOCKED_PHRASES.split(",");
const botownerid = `${process.env.OWNER_ID}`;
const Repository = `${process.env.REPO}`;
const website = `${process.env.WEBSITE}`;
const supportServer = `${process.env.SUPPORT_SERVER}`;
const TOPGG = `${process.env.TOPGG}`;

// Mongo enviorment variables
const {
    MongoClient,
    ServerApiVersion
} = require("mongodb");
const uri = `${process.env.MONGODB_URI}`;
const db = `${process.env.MONGODB_DB}`;
const logcollect = `log`;
const guildscollect = `guilds`;
const channelscollect = `channels`;
const userscollect = `users`;
const mongoclient = new MongoClient(uri, {
    monitorCommands: true,
    serverApi: {
        version: ServerApiVersion.v1,
        deprecationErrors: true,
    }
});

let log = async (LogLevel, input, modlog, modlogboolean) => {

    // Log things into the db
    async function moderatorLog(thingtolog) {
    // connect client
    await mongoclient.connect();

    // Define date and time etc..
    let date = new Date()
        .toLocaleDateString('en-us', {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric"
        });

    date = ({
        localtime: date
    });

    let logdata = Object.assign({}, thingtolog, date);

    try {
        // This stores "logdata" object in database
        await mongoclient.db(db).collection(logcollect).insertOne(logdata);
    } catch (error) {
        console.info(`Error: \n${error}`)
    };

    // close client
    await mongoclient.close();
    }

    // Log input
    if (modlogboolean) {
    if (modlog != null) {
        await moderatorLog(modlog)
        if(input === null) { console.log(`[${LogLevel}]`, `[Input is null!]`); return; };
        if(modlog === null) { console.log(`[${LogLevel}]`, `[modlog is null!]`); return; };
        console.log(`[${LogLevel}]`, `[Type of modlog: ${typeof modlog}]\n`, input); 
        return;
    };
    };

    if(input === null) { console.log(`[${LogLevel}]`, `[Input is null!]`); return; };
    console.log(`[${LogLevel}]`, input);
    return;
};

log(LogLevel.Debug, `Loggging NPM start in db`, {startLog: `NPM STARTED`}, true)

const logError = async (error) => {
    if (error.response) {
        let str = `Error ${error.response.status} ${error.response.statusText}: ${error.request.method} ${error.request.path}`;
        if (error.response.data?.error) {
            str += ": " + error.response.data.error;
        }
        log(LogLevel.Error, str, { errorLog: error }, true);
    } else {
        log(LogLevel.Error, error, { errorLog: error }, true);
    }
};


// User object used to define an object used for logging
async function userObject(user) {
    if (user != null) {

        log(LogLevel.Debug, user)
        return {
            Name: user.displayName,
            username: user.username,
            ID: user.id
        }

    }
    return `NA`
}

// Channel object used to define an object used for logging
async function channelObject(channel) {
    if (channel != null) {

        log(LogLevel.Debug, channel)
        return {
            Name: channel.name,
            ID: channel.id,
            Topic: channel.topic
        }

    }
    return `NA`
}

// Guild object used to define an object used for logging
async function guildObject(guild) {
    if (guild != null) {
        if (guild) {
            log(LogLevel.Debug, guild)
            return {
                Name: guild.name,
                ID: guild.id,
                icon: guild.icon,
                ownerid: guild.ownerid,
                systemchannelid: guild.systemChannelId
            }
        }

    }
    return `NA`
}

// Set the context variable on the db
async function setcontext(channelID, context) {
    try {
        // Connect the client to the server
        await mongoclient.connect();


        if (!await mongoclient.db(db).collection(channelscollect).countDocuments({
                channelID: `${channelID}`
            }, {
                limit: 1
            }) == 1) {
            await mongoclient.db(db).collection(channelscollect).insertOne({
                channelID: `${channelID}`,
                context: `${context}`
            })
            await mongoclient.close();
        } else {
            await mongoclient.db(db).collection(channelscollect).updateOne({
                channelID: `${channelID}`
            }, {
                $set: {
                    channelID: `${channelID}`,
                    context: `${context}`
                }
            })
            await mongoclient.close();
        }

    } finally {
        // Ensures that the client will close when you finish/error
        await mongoclient.close();
    }
}

// Clear the context variable on the db
async function clearcontext(channelID) {
    try {
        // Connect the client to the server
        await mongoclient.connect();
        if (!await mongoclient.db(db).collection(channelscollect).countDocuments({
                channelID: `${channelID}`
            }, {
                limit: 1
            }) == 1) {
            await mongoclient.db(db).collection(channelscollect).insertOne({
                channelID: `${channelID}`,
                context: `${[0]}`
            })
            await mongoclient.close();
            var clearcontextresponse = `Reset context`
        } else {
            await mongoclient.db(db).collection(channelscollect).updateOne({
                channelID: `${channelID}`
            }, {
                $set: {
                    channelID: `${channelID}`,
                    context: `${[0]}`
                }
            })
            await mongoclient.close();
            var clearcontextresponse = `Reset context`
        }

    } finally {
        // Ensures that the client will close when you finish/error
        await mongoclient.close();
    }
    log(LogLevel.Debug,
        `Log clear context for channel: ${channelID}`,
        {
        contextLog: `Cleared context for the channel`,
        channelID: channelID
        },
        true
    )
    return clearcontextresponse
}

// Read the context variable stored on the db
async function readcontext(channelID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data already exists and replaces it
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        const query = {
            channelID: `${channelID}`
        };
        const options = {
            // Sort matched documents in descending order by rating
            sort: {
                "context": -1
            },
            // Include only the `context` field in the returned document
            projection: {
                _id: 0,
                context: 1
            },
        };

        //Read context from database
        var readcontextresponse = await mongoclient.db(db).collection(channelscollect).findOne(query, options);
        readcontextresponse = JSON.parse("[" + readcontextresponse.context.replace(/"/g, '') + "]");

        await mongoclient.close();
        return readcontextresponse;
    }

    await mongoclient.close();
    return [0];
}

// Set the initial prompt for the user on the db
async function setinit(userID, initalprompt) {
    try {
        // Connect the client to the server
        await mongoclient.connect();

        if (!await mongoclient.db(db).collection(userscollect).countDocuments({
                userID: `${userID}`
            }, {
                limit: 1
            }) == 1) {
            await mongoclient.db(db).collection(userscollect).insertOne({
                userID: `${userID}`,
                initialprompt: `${initalprompt}`
            })
            await mongoclient.close();
        } else {
            await mongoclient.db(db).collection(userscollect).updateOne({
                userID: `${userID}`
            }, {
                $set: {
                    userID: `${userID}`,
                    initialprompt: `${initalprompt}`
                }
            })
            await mongoclient.close();
        }

    } finally {
        // Ensures that the client will close when you finish/error
        await mongoclient.close();
    }
}

// Read the stored initial prompt for the user on the db
async function readinitprompt(userID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exists
    if (await mongoclient.db(db).collection(userscollect).countDocuments({
            userID: `${userID}`
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        const query = {
            userID: `${userID}`
        };
        const options = {
            // Sort matched documents in descending order by rating
            sort: {
                "initialprompt": -1
            },
            // Include only the `initialprompt` field in the returned document
            projection: {
                _id: 0,
                initialprompt: 1
            },
        };

        //Read initialprompt from database
        var readinitresponse = await mongoclient.db(db).collection(userscollect).findOne(query, options);
        readinitresponse = JSON.stringify(readinitresponse.initialprompt).slice(1, -1)

        await mongoclient.close();
        return readinitresponse;
    }

    await mongoclient.close();
    return `${process.env.INITIAL_PROMPT}`;
}

// Set the system message for the channel in the db
async function setsystem(channelID, systemmessage) {
    try {
        // Connect the client to the server
        await mongoclient.connect();

        if (!await mongoclient.db(db).collection(channelscollect).countDocuments({
                channelID: `${channelID}`
            }, {
                limit: 1
            }) == 1) {
            await mongoclient.db(db).collection(channelscollect).insertOne({
                channelID: `${channelID}`,
                systemmessage: `${systemmessage}`
            })
            await mongoclient.close();
        } else {
            await mongoclient.db(db).collection(channelscollect).updateOne({
                channelID: `${channelID}`
            }, {
                $set: {
                    channelID: `${channelID}`,
                    systemmessage: `${systemmessage}`
                }
            })
            await mongoclient.close();
        }

    } finally {
        // Ensures that the client will close when you finish/error
        await mongoclient.close();
    }
}

// Read the stored system message for the channel in the db
async function readsystemmsg(channelID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exists
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        const query = {
            channelID: `${channelID}`
        };
        const options = {
            // Sort matched documents in descending order by rating
            sort: {
                "systemmessage": -1
            },
            // Include only the `systemmessage` field in the returned document
            projection: {
                _id: 0,
                systemmessage: 1
            },
        };

        //Read systemmessage from database
        var readsystemmessageresponse = await mongoclient.db(db).collection(channelscollect).findOne(query, options);
        readsystemmessageresponse = JSON.stringify(readsystemmessageresponse.systemmessage)

        await mongoclient.close();
        return readsystemmessageresponse;
    } else {

        await mongoclient.close();
        return `${process.env.SYSTEM}`;
    }
}

// Check if the user is blocked
async function checkBlockeduser(userID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exsists
    if (await mongoclient.db(db).collection(userscollect).countDocuments({
            userID: `${userID}`,
            isblocked: true
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        await mongoclient.close();
        return true
    }
    // Ensures that the client will close when you finish/error
    await mongoclient.close();
    return false
}

// Check if the guild is blocked
async function checkBlockedguild(guildID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exsists
    if (await mongoclient.db(db).collection(guildscollect).countDocuments({
            guildID: `${guildID}`,
            isblocked: true
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        await mongoclient.close();
        return true
    }
    // Ensures that the client will close when you finish/error
    await mongoclient.close();
    return false
}

// Check the reason for a blocked user
async function checkBlockeduserreason(userID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exsists
    if (await mongoclient.db(db).collection(userscollect).countDocuments({
            userID: `${userID}`
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        const query = {
            userID: `${userID}`
        };
        const options = {
            // Sort matched documents in descending order by rating
            sort: {
                "blockreason": -1
            },
            // Include only the `blockreason` field in the returned document
            projection: {
                _id: 0,
                blockreason: 1
            },
        };

        //Read blockreason from database
        var readblockreasonresponse = await mongoclient.db(db).collection(userscollect).findOne(query, options);
        readblockreasonresponse = JSON.stringify(readblockreasonresponse.blockreason).slice(1, -1)

        await mongoclient.close();
        return `${readblockreasonresponse}`
    }
    // Ensures that the client will close when you finish/error
    await mongoclient.close();
    return `User is not blocked`
}

// Check the reason for a blocked guild
async function checkBlockedguildreason(guildID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exsists
    if (await mongoclient.db(db).collection(guildscollect).countDocuments({
            guildID: `${guildID}`
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        const query = {
            guildID: `${guildID}`
        };
        const options = {
            // Sort matched documents in descending order by rating
            sort: {
                "blockreason": -1
            },
            // Include only the `blockreason` field in the returned document
            projection: {
                _id: 0,
                blockreason: 1
            },
        };

        //Read blockreason from database
        var readblockreasonresponse = await mongoclient.db(db).collection(guildscollect).findOne(query, options);
        readblockreasonresponse = JSON.stringify(readblockreasonresponse.blockreason).slice(1, -1)

        await mongoclient.close();
        return `${readblockreasonresponse}`
    }
    // Ensures that the client will close when you finish/error
    await mongoclient.close();
    return `Guild is not blocked`
}

// Add a user to the blocked partition of the db
async function addBlockeduser(userID, reason) {

    await mongoclient.connect();

    if (!await mongoclient.db(db).collection(userscollect).countDocuments({
            userID: `${userID}`
        }, {
            limit: 1
        }) == 1) {
        await mongoclient.db(db).collection(userscollect).insertOne({
            userID: `${userID}`,
            isblocked: true,
            blockreason: `${reason}`
        })
        await mongoclient.close();
        log(LogLevel.Debug,
            `Blocked the user: ${userID}`,
            {
            blockLog: `Add blocked user`,
            userID: `${userID}`,
            blockreason: `${reason}`
            },
            true
        )
        return `Blocked USER (${userID})`;
    } else {
        await mongoclient.db(db).collection(userscollect).updateOne({
            userID: `${userID}`
        }, {
            $set: {
                userID: `${userID}`,
                isblocked: true,
                blockreason: `${reason}`
            }
        })
        await mongoclient.close();
        log(LogLevel.Debug,
            `Blocked the user: ${userID}`,
            {
            blockLog: `Add blocked user`,
            userID: `${userID}`,
            blockreason: `${reason}`
            },
            true
        )
        return `Blocked USER (${userID})`;
    }
}

// Add a guild to the blocked partition of the db
async function addBlockedguild(guildID, reason) {
    await mongoclient.connect();

    if (!await mongoclient.db(db).collection(guildscollect).countDocuments({
            guildID: `${guildID}`
        }, {
            limit: 1
        }) == 1) {
        await mongoclient.db(db).collection(guildscollect).insertOne({
            guildID: `${guildID}`,
            isblocked: true,
            blockreason: `${reason}`
        })
        await mongoclient.close();
        log(LogLevel.Debug,
            `Blocked the guild: ${guildID}`,
            {
            blockLog: `Add blocked guild`,
            guildID: `${guildID}`,
            blockreason: `${reason}`
            },
            true
        )
        return `Blocked GUILD (${guildID})`;
    } else {
        await mongoclient.db(db).collection(guildscollect).updateOne({
            guildID: `${guildID}`
        }, {
            $set: {
                guildID: `${guildID}`,
                isblocked: true,
                blockreason: `${reason}`
            }
        })
        await mongoclient.close();
        log(LogLevel.Debug,
            `Blocked the guild: ${guildID}`,
            {
            blockLog: `Add blocked guild`,
            guildID: `${guildID}`,
            blockreason: `${reason}`
            },
            true
        )
        return `Blocked GUILD (${guildID})`;
    }
}

// Set the welcoming system message for the guild
async function setwelcomesystemmsg(guildID, systemmessage) {
    try {
        // Connect the client to the server
        await mongoclient.connect();

        //Check if data already exsists and replaces it
        if (await mongoclient.db(db).collection(guildscollect).countDocuments({
                guildID: `${guildID}`
            }, {
                limit: 1
            }) == 1) //if it does 
        {
            await mongoclient.db(db).collection(guildscollect).updateOne({
                guildID: `${guildID}`
            }, {
                $set: {
                    guildID: `${guildID}`,
                    welcomesystemmessage: `${systemmessage}`
                }
            });
        } else {
            await mongoclient.db(db).collection(guildscollect).insertOne({
                guildID: `${guildID}`,
                welcomesystemmessage: `${systemmessage}`
            })
        }
    } finally {
        // Ensures that the client will close when you finish/error
        await mongoclient.close();
    }
    log(LogLevel.Debug,
        `Set welcome system message for guild(${guildID})`,
        {
        systemLog: `Set welcome system message`,
        guildID: `${guildID}`,
        welcomesystemmessage: `${systemmessage}`
        },
        true
    )
}

// Read the welcoming system message for the guild
async function readwelcomesystemmsg(guildID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exists
    if (await mongoclient.db(db).collection(guildscollect).countDocuments({
            guildID: `${guildID}`,
            welcomeusers: true
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        const query = {
            guildID: `${guildID}`,
            welcomeusers: true
        };
        const options = {
            // Sort matched documents in descending order by rating
            sort: {
                "welcomesystemmessage": -1
            },
            // Include only the `welcomesystemmessage` field in the returned document
            projection: {
                _id: 0,
                welcomesystemmessage: 1
            },
        };


        //Read welcomesystemmessage from database
        var readsystemmessageresponse = await mongoclient.db(db).collection(guildscollect).findOne(query, options);

        if (Object.keys(readsystemmessageresponse).length === 0) {
            await mongoclient.close();
            return `${process.env.SYSTEM}`;
        }

        readsystemmessageresponse = JSON.stringify(readsystemmessageresponse.welcomesystemmessage).slice(1, -1)

        await mongoclient.close();
        return readsystemmessageresponse;
    }

    await mongoclient.close();
    return `${process.env.SYSTEM}`;
}

// Enable/Disable the welcome message sent by the bot
async function setwelcomesystemmsgboolean(guildID, boolean) {
    try {
        // Connect the client to the server
        await mongoclient.connect();

        //Check if data already exsists and replaces it
        if (await mongoclient.db(db).collection(guildscollect).countDocuments({
                guildID: `${guildID}`
            }, {
                limit: 1
            }) == 1) //if it does 
        {
            await mongoclient.db(db).collection(guildscollect).updateOne({
                guildID: `${guildID}`
            }, {
                $set: {
                    guildID: `${guildID}`,
                    welcomeusers: boolean
                }
            });
        } else {
            await mongoclient.db(db).collection(guildscollect).insertOne({
                guildID: `${guildID}`,
                welcomeusers: boolean
            })
        }
    } finally {
        // Ensures that the client will close when you finish/error
        await mongoclient.close();
    }
}

// Read the boolean for the welcome message in the db
async function readwelcomesystemmsgboolean(guildID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exists
    if (await mongoclient.db(db).collection(guildscollect).countDocuments({
            guildID: `${guildID}`
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        const query = {
            guildID: `${guildID}`
        };
        const options = {
            // Sort matched documents in descending order by rating
            sort: {
                "welcomeusers": -1
            },
            // Include only the `boolean` field in the returned document
            projection: {
                _id: 0,
                welcomeusers: 1
            },
        };

        //Read boolean from database
        var readbooleanresponse = await mongoclient.db(db).collection(guildscollect).findOne(query, options);
        readbooleanresponse = JSON.stringify(readbooleanresponse.welcomeusers)

        await mongoclient.close();
        return readbooleanresponse;
    }

    await mongoclient.close();
    return false;
}

// Remove the bot's ability to talk in an channel
async function removeChannel(channelID) {

    // Connect the client to the server
    await mongoclient.connect();

    //Check if data exsists and inserts if not
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: true
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                usechannel: false
            }
        })
        await mongoclient.close();
        return `Removed channel (${channelID})`;
    }
    if (!await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: true
        }, {
            limit: 1
        }) == 1 &&
        !await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: false
        }, {
            limit: 1
        }) == 1 &&
        await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`
        }, {
            limit: 1
        }) == 1) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                usechannel: false
            }
        })
        await mongoclient.close();
        return `Removed channel (${channelID}) (Migrated)`;
    }

    // Ensures that the client will close when you finish/error
    await mongoclient.close();
    return `CHANNEL (${channelID}) is not listed`;
}

// Enable the bot's ability to talk in an channel
async function addChannel(channelID) {

    // Connect the client to the server
    await mongoclient.connect();

    //Check if data exsists and inserts if not
    if (!await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`
        }, {
            limit: 1
        }) == 1) {
        await mongoclient.db(db).collection(channelscollect).insertOne({
            channelID: `${channelID}`,
            usechannel: true
        })
        await mongoclient.close();
        return `Added (${channelID})`;
    }
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: false
        }, {
            limit: 1
        }) == 1) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`,
            usechannel: false
        }, {
            $set: {
                channelID: `${channelID}`,
                usechannel: true
            }
        })
        await mongoclient.close();
        return `Added (${channelID})`;
    }
    if (!await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: true
        }, {
            limit: 1
        }) == 1 &&
        !await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: false
        }, {
            limit: 1
        }) == 1 &&
        await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`
        }, {
            limit: 1
        }) == 1) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                usechannel: true
            }
        })
        await mongoclient.close();
        return `Added (${channelID}) (Migrated)`;
    }

    // Ensures that the client will close when you finish/error
    await mongoclient.close();
    return `CHANNEL (${channelID}) is already listed`;
}

// Check if the bot can message in the channel
async function checkChannel(channelID) {
    // Connect the client to the server
    await mongoclient.connect();
    //Check if data exsists
    if (!await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: true
        }, {
            limit: 1
        }) == 1 &&
        !await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: false
        }, {
            limit: 1
        }) == 1 &&
        await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`
        }, {
            limit: 1
        }) == 1) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                usechannel: true
            }
        })
        await mongoclient.close();
        return true;
    }
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            usechannel: true
        }, {
            limit: 1
        }) == 1) //if it does 
    {
        await mongoclient.close();
        return true
    }
    // Ensures that the client will close when you finish/error
    await mongoclient.close();
    return false
}

// Set varius channel settings
async function setChannelSettings(channelID, requires_mention, include_system_time, include_coordinated_universal_time,
    include_username, include_user_id, include_user_nick, include_channel_id, include_channel_name, include_guild_name, 
    temperature, top_k, top_p, min_p, repeat_penalty
    ) {

    await mongoclient.connect();

    if (requires_mention != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                requiresMention: requires_mention
            }
        })
    }

    if (include_system_time != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_system_time: include_system_time
            }
        })
    }

    if (include_coordinated_universal_time != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_coordinated_universal_time: include_coordinated_universal_time
            }
        })
    }

    if (include_username != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_username: include_username
            }
        })
    }

    if (include_user_id != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_user_id: include_user_id
            }
        })
    }

    if (include_user_nick != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_user_nick: include_user_nick
            }
        })
    }

    if (include_channel_id != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_channel_id: include_channel_id
            }
        })
    }

    if (include_channel_name != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_channel_name: include_channel_name
            }
        })
    }

    if (include_guild_name != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                include_guild_name: include_guild_name
            }
        })
    }

    if (temperature != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                temperature: temperature
            }
        })
    }

    if (top_k != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                top_k: top_k
            }
        })
    }

    if (top_p != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                top_p: top_p
            }
        })
    }

    if (min_p != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                min_p: min_p
            }
        })
    }

    if (repeat_penalty != null) {
        await mongoclient.db(db).collection(channelscollect).updateOne({
            channelID: `${channelID}`
        }, {
            $set: {
                channelID: `${channelID}`,
                repeat_penalty: repeat_penalty
            }
        })
    }

    await mongoclient.close();
    return;
}

// Read current channel settings
async function readChannelSettings(channelID) {

    await mongoclient.connect();

    var requiresMention = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            requiresMention: false
        }, {
            limit: 1
        }) == 1) {
        var requiresMention = false
    }

    var include_system_time = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_system_time: false
        }, {
            limit: 1
        }) == 1) {
        var include_system_time = false
    }

    var include_coordinated_universal_time = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_coordinated_universal_time: false
        }, {
            limit: 1
        }) == 1) {
        var include_coordinated_universal_time = false
    }

    var include_username = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_username: false
        }, {
            limit: 1
        }) == 1) {
        var include_username = false
    }

    var include_user_id = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_user_id: false
        }, {
            limit: 1
        }) == 1) {
        var include_user_id = false
    }

    var include_user_nick = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_user_nick: false
        }, {
            limit: 1
        }) == 1) {
        var include_user_nick = false
    }

    var include_channel_id = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_channel_id: false
        }, {
            limit: 1
        }) == 1) {
        var include_channel_id = false
    }

    var include_channel_name = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_channel_name: false
        }, {
            limit: 1
        }) == 1) {
        var include_channel_name = false
    }

    var include_guild_name = true
    if (await mongoclient.db(db).collection(channelscollect).countDocuments({
            channelID: `${channelID}`,
            include_guild_name: false
        }, {
            limit: 1
        }) == 1) {
        var include_guild_name = false
    }

    var temperature = 0.7
    var temperatureresponse = await mongoclient.db(db).collection(channelscollect).findOne(
        {
        channelID: `${channelID}`
    },
    {
        sort: {
            "temperature": -1
        },
        projection: {
            _id: 0,
            temperature: 1
        },
    });

    var temperatureresponse = JSON.stringify(temperatureresponse.temperature).slice(1, -1) * 1
    if (temperatureresponse != temperature) {var temperature = temperatureresponse}

    var repeat_penalty = 1.1
    var repeat_penalty_response = await mongoclient.db(db).collection(channelscollect).findOne(
        {
        channelID: `${channelID}`
    },
    {
        sort: {
            "repeat_penalty": -1
        },
        projection: {
            _id: 0,
            repeat_penalty: 1
        },
    });

    var repeat_penalty_response = JSON.stringify(repeat_penalty_response.repeat_penalty).slice(1, -1) * 1
    if (repeat_penalty_response != repeat_penalty) {var repeat_penalty = repeat_penalty_response}

    var top_k = 40
    var top_k_response = await mongoclient.db(db).collection(channelscollect).findOne(
        {
        channelID: `${channelID}`
    },
    {
        sort: {
            "top_k": -1
        },
        projection: {
            _id: 0,
            top_k: 1
        },
    });

    var top_k_response = JSON.stringify(top_k_response.top_k).slice(1, -1) * 1
    if (top_k_response != top_k) {var top_k = top_k_response}

    var top_p = 0.9
    var top_p_response = await mongoclient.db(db).collection(channelscollect).findOne(
        {
        channelID: `${channelID}`
    },
    {
        sort: {
            "top_p": -1
        },
        projection: {
            _id: 0,
            top_p: 1
        },
    });

    var top_p_response = JSON.stringify(top_p_response.top_p).slice(1, -1) * 1
    if (top_p_response != top_p) {var top_p = top_p_response}

    var min_p = 0
    var min_p_response = await mongoclient.db(db).collection(channelscollect).findOne(
        {
        channelID: `${channelID}`
    },
    {
        sort: {
            "min_p": -1
        },
        projection: {
            _id: 0,
            min_p: 1
        },
    });

    var min_p_response = JSON.stringify(min_p_response.min_p).slice(1, -1) * 1
    if (min_p_response != min_p) {var min_p = min_p_response}

    await mongoclient.close();
    return {
        requiresMention,
        include_system_time,
        include_coordinated_universal_time,
        include_username,
        include_user_id,
        include_user_nick,
        include_channel_id,
        include_channel_name,
        include_guild_name,
        temperature,
        repeat_penalty,
        top_k,
        top_p,
        min_p
    }

}

// Check if the string sent by the user contains a blocked phrase defined in env
async function checkForBlockedWordsUSER(user, uncheckedcontent) {
    var bound = '[^\\w\u00c0-\u02c1\u037f-\u0587\u1e00-\u1ffe]';
    var regex = new RegExp('(?:^|' + bound + ')(?:' +
        BLOCKED_PHRASES.join('|') +
        ')(?=' + bound + '|$)', 'i');
    if (regex.test(uncheckedcontent)) {
        try {
            await client.users.cache.get(`${user.id}`).send(`You have been automatically blocked by stuff-and-things for using a blocked phrase \`${uncheckedcontent}\` in response gen if you think this may be a mistake please [file an issue in our ${supportServer}](https://discord.com/invite/RwZd3T8vde)`);
        } finally {
            var blockreason = `You have been automatically blocked by stuff-and-things for using a blocked phrase \`${uncheckedcontent}\` in response gen`
            await addBlockeduser(user.id, blockreason);
            return true;
        }
    }
    return false;
}

// Check if the string sent by the guild contains a blocked phrase defined in env
async function checkForBlockedWordsGUILD(guild, uncheckedcontent) {
    var bound = '[^\\w\u00c0-\u02c1\u037f-\u0587\u1e00-\u1ffe]';
    var regex = new RegExp('(?:^|' + bound + ')(?:' +
        BLOCKED_PHRASES.join('|') +
        ')(?=' + bound + '|$)', 'i');
    if (regex.test(uncheckedcontent)) {
        const channelG = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.members.me).has(([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]))
        )
        await channelG.sendTyping();
        await channelG.send(`The guild has been automatically blocked by stuff-and-things for using a blocked phrase \`${uncheckedcontent}\` in response gen if you think this may be a mistake please [file an issue in our support Server](${supportServer})`);
        var blockreason = `You have been automatically blocked by stuff-and-things for using a blocked phrase \`${uncheckedcontent}\` in response gen`
        await addBlockedguild(guild.id, blockreason);
        guild.leave();
        return true;
    }
    return false;
}

// Prevent uncaught Exception stops
process.on('uncaughtException', function(err) {
    console.error(err);
    console.error("uncaughtException...");
    console.info("Attempting to continue listening for requests!")
    log(LogLevel.Debug,
        `${err}\nuncaughtException...\nAttempting to continue listening for requests!`,
        {
        uncaughtExceptionLog: `${err}\nuncaughtException...\nAttempting to continue listening for requests!`
        },
        true
    )
});

dotenv.config();

if (servers.length == 0) {
    throw new Error("No servers available");
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Make an request to ollama
async function makeRequest(path, method, data) {
    while (servers.filter(server => server.available).length == 0) {
        // wait until a server is available
        await new Promise(res => setTimeout(res, 1000));
    }

    let error = null;
    // randomly loop through the servers available, don't shuffle the actual array because we want to be notified of any updates
    let order = new Array(servers.length).fill().map((_, i) => i);
    if (randomServer) order = shuffleArray(order);
    for (const j in order) {
        if (!order.hasOwnProperty(j)) continue;
        const i = order[j];
        // try one until it succeeds
        try {
            // make a request to ollama
            if (!servers[i].available) continue;
            const url = new URL(servers[i].url); // don't modify the original URL

            servers[i].available = false;

            if (path.startsWith("/")) path = path.substring(1);
            if (!url.pathname.endsWith("/")) url.pathname += "/"; // safety
            url.pathname += path;
            log(LogLevel.Debug, `Making request to ${url}`);
            const result = await axios({
                method,
                url,
                data,
                responseType: "text"
            });
            servers[i].available = true;
            return result.data;
        } catch (err) {
            servers[i].available = true;
            error = err;
            logError(error);
        }
    }
    if (!error) {
        throw new Error("No servers available");
    }
    throw error;
}

// Make an request to webui-forge
async function makeFluxRequest(path, method, data) {
    while (FluxServers.filter(server => server.available).length == 0) {
        // wait until a server is available
        await new Promise(res => setTimeout(res, 1000));
    }

    let error = null;
    // randomly loop through the servers available, don't shuffle the actual array because we want to be notified of any updates
    let order = new Array(FluxServers.length).fill().map((_, i) => i);
    if (randomServer) order = shuffleArray(order);
    for (const j in order) {
        if (!order.hasOwnProperty(j)) continue;
        const i = order[j];
        // try one until it succeeds
        try {
            // make a request to flux
            if (!FluxServers[i].available) continue;
            const url = new URL(FluxServers[i].url); // don't modify the original URL

            FluxServers[i].available = false;

            if (path.startsWith("/")) path = path.substring(1);
            if (!url.pathname.endsWith("/")) url.pathname += "/"; // safety
            url.pathname += path;
            log(LogLevel.Debug, `Making request to ${url}`);
            const result = await axios({
                method,
                url,
                data
            });
            FluxServers[i].available = true;
            return result.data;
        } catch (err) {
            FluxServers[i].available = true;
            error = err;
            logError(error);
        }
    }
    if (!error) {
        throw new Error("No servers available");
    }
    throw error;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    allowedMentions: {
        users: [],
        roles: [],
        repliedUser: false
    },
    partials: [
        Partials.Channel
    ]
});

const rest = new REST({
    version: "10"
}).setToken(process.env.TOKEN);

client.once(Events.ClientReady, async () => {
    await client.guilds.fetch();
    client.user.setPresence({
        activities: [{
            name: `/help and, @${client.user.username}`,
            type: ActivityType.Listening,
            url: `${website}`
        }],
        status: "online"
    });
    if (getBoolean(process.env.RENEW_COMMANDS)) {
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: commands
        });
        log(LogLevel.Info, "Successfully reloaded application slash (/) commands.");
        log(LogLevel.Info, `Started (Waiting for request)`);
    }
}
);

const messages = {};

// split text so it fits in a Discord message
function splitText(str, length) {
    // trim matches different characters to \s
    str = str
        .replace(/\r\n/g, "\n").replace(/\r/g, "\n")
        .replace(/^\s+|\s+$/g, "");
    const segments = [];
    let segment = "";
    let word, suffix;

    function appendSegment() {
        segment = segment.replace(/^\s+|\s+$/g, "");
        if (segment.length > 0) {
            segments.push(segment);
            segment = "";
        }
    }
    // match a word
    while ((word = str.match(/^[^\s]*(?:\s+|$)/)) != null) {
        suffix = "";
        word = word[0];
        if (word.length == 0) break;
        if (segment.length + word.length > length) {
            // prioritise splitting by newlines over other whitespaces
            if (segment.includes("\n")) {
                // append up all but last paragraph
                const beforeParagraph = segment.match(/^.*\n/s);
                if (beforeParagraph != null) {
                    const lastParagraph = segment.substring(beforeParagraph[0].length, segment.length);
                    segment = beforeParagraph[0];
                    appendSegment();
                    segment = lastParagraph;
                    continue;
                }
            }
            appendSegment();
            // if word is larger than the split length
            if (word.length > length) {
                word = word.substring(0, length);
                if (length > 1 && word.match(/^[^\s]+$/)) {
                    // try to hyphenate word
                    word = word.substring(0, word.length - 1);
                    suffix = "-";
                }
            }
        }
        str = str.substring(word.length, str.length);
        segment += word + suffix;
    }
    appendSegment();
    return segments;
}

// Get boolean for an string
function getBoolean(str) {
    return !!str && str != "false" && str != "no" && str != "off" && str != "0";
}


async function replySplitMessage(replyMessage, content) {
    const responseMessages = splitText(content, 2000).map(text => ({
        content: text
    }));

    const replyMessages = [];
    for (let i = 0; i < responseMessages.length; ++i) {
        if (i == 0) {
            replyMessages.push(await replyMessage.reply(responseMessages[i]));
        } else {
            replyMessages.push(await replyMessage.channel.send(responseMessages[i]));
        }
    }
    return replyMessages;
}

async function LLMUserInputScopeFetch(userInput, user, channel, guild) {

    if (channel === null && guild === null) {
        log(LogLevel.Debug, `Message:\n${userInput}`)
        return `Message:\n${userInput}`;
    }
    if (user != false) {
        var currentutctime = (await readChannelSettings(channel.id)).include_coordinated_universal_time ? `Current UTC time: ${new Date().toISOString()}\n` : ``;
        var currentsystime = (await readChannelSettings(channel.id)).include_system_time ? `Current System time: ${new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" })}\n` : ``;
        var UserUsername = (await readChannelSettings(channel.id)).include_username ? `USERNAME OF DISCORD USER: ${user.username}\n` : ``;
        var UserID = (await readChannelSettings(channel.id)).include_user_id ? `DISCORD USER-ID: ${user.id}\nDISCORD USER MENTION IS: <@${user.id}>` : ``;
    } else {
        var UserUsername = ``;
        var UserID = ``;
    }
    if (channel != false) {
        var ChannelID = (await readChannelSettings(channel.id)).include_channel_id ? `DISCORD CHANNEL ID: ${channel.id}\n` : ``;
    } else {
        var ChannelID = ``;
    }
    if (guild == null) {
        if (user != false) {
            var ChannelName = (await readChannelSettings(channel.id)).include_channel_name ? `Direct-message with the user ${user.tag}\n` : ``;
        } else {
            var ChannelName = ``;
        }
        var ServerName = ``;
    } else {
        if (channel != false) {
            if (ChannelID != ``) ChannelID += `DISCORD CHANNEL MENTION: <#${channel.id}>\n`;
            var ChannelName = (await readChannelSettings(channel.id)).include_channel_name ? `DISCORD SERVER CHANNEL NAME: #${channel.name}\n` : ``;
        } else {
            var ChannelID = ``;
            var ChannelName = ``;
        }
        if (guild != false) {
            var ServerName = (await readChannelSettings(channel.id)).include_guild_name ? `DISCORD SERVER NAME: ${guild.name}\n` : ``;
        } else {
            var ServerName = ``;
        }
    }
    if (user != false) {
        var Nickname = (await readChannelSettings(channel.id)).include_user_nick ? `DISCORD NICKNAME OF USER: ${user.displayName}\n` : ``;
        var initialPrompt = `${await readinitprompt(user.id)}\n\n`
        log(LogLevel.Debug, `INITIAL PROMPT\n${initialPrompt}`);
    } else {
        var Nickname = ``
        var initialPrompt = ``
    }

    log(LogLevel.Debug, `USER INPUT\n${currentsystime}${currentutctime}${ServerName}${ChannelName}${ChannelID}${UserUsername}${Nickname}${UserID}\nMessage:\n${userInput}`)
    return `Init-Prompt\n${initialPrompt}${currentsystime}${currentutctime}${ServerName}${ChannelName}${ChannelID}${UserUsername}${Nickname}${UserID}\n\nMessage:\n${userInput}`;


}

// Make an request to the .env defined ollama LLM and Vision-LLM models
async function responseLLM(userInput, user, channel, guild, system, contextboolean, image) {

    let userIn = userInput
    if (contextboolean) {
        try {
            var context = await readcontext(channel.id)
        } catch {
            var context = [0]
        }
    } else {
        var context = [0]
    }
    userInput = await LLMUserInputScopeFetch(userInput, user, channel, guild)
    try {
        var usersystemMessage = await readsystemmsg(channel.id)
    } catch {
        var usersystemMessage = process.env.SYSTEM
    }
    var systemMessagetomodel = `${usersystemMessage}`
    if (system != true) {
        systemMessagetomodel = system
    }
    log(LogLevel.Debug, `SYSTEM MESSAGE\n${systemMessagetomodel}`);

    if (!image) {
        var response = (await makeRequest("/api/generate", "post", {
            model: model,
            prompt: userInput,
            system: systemMessagetomodel,
            options: {
            temperature: await readChannelSettings(channel.id).temperature,
            repeat_penalty: await readChannelSettings(channel.id).repeat_penalty,
            top_k: await readChannelSettings(channel.id).top_k,
            top_p: await readChannelSettings(channel.id).top_p,
            min_p: await readChannelSettings(channel.id).min_p
            },
            keep_alive: 0,
            context
        }));
    } else {
        var response = (await makeRequest("/api/generate", "post", {
            model: imagemodel,
            prompt: userInput,
            system: systemMessagetomodel,
            keep_alive: 0,
            images: image,
            context
        }));
    }

    if (typeof response != "string") {
        throw new TypeError("response is not a string, this may be an error with ollama");
    }

    response = response.split("\n").filter(e => !!e).map(e => {
        return JSON.parse(e);
    });

    let responseText = response.map(e => e.response).filter(e => e != null).join("").trim();
    if (responseText.length == 0) {
        responseText = "(No response)";
    }

    let responseError = response.map(e => e.error).filter(e => e != null)
    if (responseError.length != 0) {
        responseText = `${responseError}`;
    }

    if (contextboolean) {
        try {
            context = response.filter(e => e.done && e.context)[0].context;
            await setcontext(channel.id, context)
        } catch {}
    }

    let llmLog = {
        LLM_Log: `A request was made to the LLM`,
        userInput: userIn,
        response: responseText,
        user: await userObject(user),
        channel: await channelObject(channel),
        guild: await guildObject(guild)
    }
    log(
        LogLevel.Debug, 
        responseText,
        llmLog,
        true
    )
    return responseText

}

async function DonwloadImage(message) {
    try {
        let words = message.split(/\s+/); // Using a regex to split by whitespace
        let url = null; // Initialize url to null

        for (let word of words) {
            try {
                let potentialUrl = new URL(word);
                url = potentialUrl.href;
                break;
            } catch (e) {
                // If the word is not a valid URL, it will throw an error which we ignore
            }
        }
        log(LogLevel.Debug, `making rq to ${url}`)
        const response = await axios.get(url, {
            responseType: "text",
            responseEncoding: "base64",
        });
        return [response.data]
    } catch (error) {
        log(LogLevel.Error, `Failed to download image files: ${error}`);
        return `fail`; // Stop processing if file download fails
    }
}

// Make an request to the stable diffusion webui forge
async function sdapi(interaction, prompt, seed, denoising_strength, width, height, cfg_scale,
    distilled_cfg_scale, sampler_name, steps, batch_count, batch_size, enhance_prompt,
    sdapiv1string, init_images, upscaling_resize, upscaler_1, upscaler_2, extras_upscaler_2_visibility) {

    try {

        async function images(responseFlux) {
            return responseFlux.images.map((image) =>
                Buffer.from(image, "base64")
            )
        }

        if (sdapiv1string == `extra-batch-images`) {
            const responseFlux = await makeFluxRequest(
                `/sdapi/v1/${sdapiv1string}`,
                "post", {
                    show_extras_results: true,
                    gfpgan_visibility: 0,
                    codeformer_visibility: 0,
                    codeformer_weight: 0,
                    upscaling_crop: true,
                    upscale_first: false,
                    resize_mode: 0,
                    upscaling_resize,
                    upscaler_1,
                    upscaler_2,
                    extras_upscaler_2_visibility,
                    imageList: init_images,
                    send_images: true,
                    save_images: false,
                });
            log(
                LogLevel.Debug,
                null,
                {
                sdapiLog: `A request was made to sdapi for a upscaled image`,
                beforeimage: init_images,
                afterimage: responseFlux,
                user: await userObject(interaction.user),
                channel: await channelObject(interaction.channel),
                guild: await guildObject(interaction.guild)
                },
                true
            )
            return await images(responseFlux)
        }
        if (sdapiv1string == `img2img`) {
            const responseFlux = await makeFluxRequest(
                `/sdapi/v1/${sdapiv1string}`,
                "post", {
                    prompt,
                    seed,
                    init_images,
                    denoising_strength,
                    width,
                    height,
                    cfg_scale,
                    distilled_cfg_scale,
                    sampler_name,
                    steps,
                    num_inference_steps: steps,
                    batch_count,
                    batch_size,
                    enhance_prompt,
                    send_images: true,
                    save_images: false,
                });
            log(
                LogLevel.Debug,
                null,
                {
                sdapiLog: `A request was made to sdapi for a image to image image`,
                prompt,
                beforeimage: init_images,
                afterimage: responseFlux,
                userID: interaction.user.id,
                UserUsername: interaction.user.username,
                userDisplayname: interaction.user.displayName,
                user: await userObject(interaction.user),
                channel: await channelObject(interaction.channel),
                guild: await guildObject(interaction.guild)
                },
                true
            )
            return await images(responseFlux)
        }
        if (sdapiv1string == `txt2img`) {
            const responseFlux = await makeFluxRequest(
                `/sdapi/v1/${sdapiv1string}`,
                "post", {
                    prompt,
                    seed,
                    denoising_strength,
                    width,
                    height,
                    cfg_scale,
                    distilled_cfg_scale,
                    sampler_name,
                    steps,
                    num_inference_steps: steps,
                    batch_count,
                    batch_size,
                    enhance_prompt,
                    send_images: true,
                    save_images: false,
                });

            log(
                LogLevel.Debug,
                null,
                {
                sdapiLog: `A request was made to sdapi for a text to image image`,
                prompt,
                afterimage: responseFlux,
                user: await userObject(interaction.user),
                channel: await channelObject(interaction.channel),
                guild: await guildObject(interaction.guild)
                }
            )
            return await images(responseFlux)
        }

    } catch (error) {
        log(LogLevel.Error, error)
        const errorimage = await axios.get(`https://wallpapers.com/images/hd/error-placeholder-image-2e1q6z01rfep95v0.jpg`, {
            responseType: "text",
            responseEncoding: "base64",
        });
        return errorimage
    }
}

// On the event of a message 
client.on(Events.MessageCreate, async message => {
    let typing = false;
    try {
        await message.fetch();

        // return if not in the right channel
        const channelID = message.channel.id;
        if (message.guild && !await checkChannel(message.channel.id)) return;

        // return if user is the bot.
        if (!message.author.id) return;
        if (message.author.id == client.user.id) return;

        const botRole = message.guild?.members?.me?.roles?.botRole;
        const myMention = new RegExp(`<@((!?${client.user.id}${botRole ? `)|(&${botRole.id}` : ""}))>`, "g"); // RegExp to match a mention for the bot

        if (typeof message.content !== "string" || message.content.length == 0) {
            return;
        }

        let userInput = message.content
            .replace(new RegExp("^s*" + myMention.source, ""), "").trim();

        let userInputImageCheck = message.content
            .replace(new RegExp("^s*" + myMention.source, ""), "").trim();

        if (message.type == MessageType.Reply) {
            const reply = await message.fetchReference();
            if (!reply) return;
            if (reply.author.id != client.user.id) return;
            userInput = `${userInput} - This message from user is in reply to one of your previous mesasges "${reply}"`
        } else if (message.type != MessageType.Default) {
            return;
        }

        if (message.type == MessageType.Default && ((await readChannelSettings(message.channel.id)).requiresMention && message.guild && !message.content.match(myMention))) return;

        if (await checkBlockeduser(message.author.id)) {
            try {
                let blockedUsermsg = `You (${message.author.username} - ${message.author.displayName} - ${message.author.id} - <@${message.author.id}>) have been blocked by stuff-and-things for the following reason ${await checkBlockeduserreason(message.author.id)} if you think this may be a mistake please [file an issue in our support Server](${supportServer})`
                await message.reply(blockedUsermsg);
                log(LogLevel.Debug, `Sent message "${blockedUsermsg}"`)
            } catch (error) {
                logError(error);
            }
            return
        }



        if (message.guild) {
            await message.guild.channels.fetch();
            await message.guild.members.fetch();

            if (await checkBlockedguild(message.guild.id)) {
                log(LogLevel.Debug, `Message sent in an guild that is blocked!! (${message.guild.name} - ${message.guild.id})`)
                try {
                    const channelG = message.guild.channels.cache.find(c =>
                        c.type === ChannelType.GuildText &&
                        c.permissionsFor(message.guild.members.me).has(([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]))
                    )
                    let responseLeavemsg = `This guild (${message.guild.name} - ${message.guild.id}) has been blocked by stuff-and-things for the following reason ${await checkBlockedguildreason(message.guild.id)} if you think this may be a mistake please [file an issue in our support Server](${supportServer})`
                    await channelG.send(responseLeavemsg);
                    log(LogLevel.Debug, `Sent message "${responseLeavemsg}"`)
                } catch (error) {
                    logError(error);
                }
                try {
                    message.guild.leave();
                    log(LogLevel.Debug, `Left the guild (${message.guild.name} - ${message.guild.id})`)
                } catch (error) {
                    logError(error);
                }
                return
            }
        }

        userInput = userInput
            .replace(myMention, "")
            .replace(/<#([0-9]+)>/g, (_, id) => {
                if (message.guild) {
                    const chn = message.guild.channels.cache.get(id);
                    if (chn) return `#${chn.name}`;
                }
                return "#unknown-channel";
            })
            .replace(/<@!?([0-9]+)>/g, (_, id) => {
                if (id == message.author.id) return message.author.username;
                if (message.guild) {
                    const mem = message.guild.members.cache.get(id);
                    if (mem) return `@${mem.user.username}`;
                }
                return "@unknown-user";
            })
            .replace(/<:([a-zA-Z0-9_]+):([0-9]+)>/g, (_, name) => {
                return `emoji:${name}:`;
            })
            .trim();

        if (userInput.length == 0) return;

        var imagesb64 = false
        // Process files if attached
        if (message.attachments.size > 0) {
            const imageAttachments = Array.from(message.attachments, ([, value]) => value).filter(att => att.contentType.startsWith("image"));
            if (imageAttachments.length > 0) {
                try {
                    await Promise.all(imageAttachments.map(async (att, i) => {
                        log(LogLevel.Debug, `making rq to ${att.url}`)
                        const response = await axios.get(att.url, {
                            responseType: "text",
                            responseEncoding: "base64",
                        });
                        imagesb64 = [response.data]
                    }));
                } catch (error) {
                    log(LogLevel.Error, `Failed to download image files: ${error}`);
                    await message.reply({
                        content: "Failed to download image files"
                    });
                    return; // Stop processing if file download fails
                }
            }
        }

        if (message.attachments.size > 0) {
            const textAttachments = Array.from(message.attachments, ([, value]) => value).filter(att => att.contentType.startsWith("text"));
            if (textAttachments.length > 0) {
                try {
                    await Promise.all(textAttachments.map(async (att, i) => {
                        log(LogLevel.Debug, `making rq to ${att.url}`)
                        const response = await axios.get(att.url);
                        userInput += `\n${i + 1}. File - ${att.name}:\n${response.data}`;
                    }));
                } catch (error) {
                    log(LogLevel.Error, `Failed to download text files: ${error}`);
                    await message.reply({
                        content: "Failed to download text files"
                    });
                    return; // Stop processing if file download fails
                }
            }
        }

        if (userInputImageCheck.includes(".gif")) {
            imagesb64 = await DonwloadImage(userInputImageCheck)
            if (imagesb64 == `fail`) {
                log(LogLevel.Error, `Failed to download image files`);
                await message.reply({
                    content: "Failed to download image files"
                });
            }
        }

        if (userInputImageCheck.includes(".png")) {
            imagesb64 = await DonwloadImage(userInputImageCheck)
            if (imagesb64 == `fail`) {
                log(LogLevel.Error, `Failed to download image files`);
                await message.reply({
                    content: "Failed to download image files"
                });
            }
        }

        if (userInputImageCheck.includes(".jpg")) {
            imagesb64 = await DonwloadImage(userInputImageCheck)
            if (imagesb64 == `fail`) {
                log(LogLevel.Error, `Failed to download image files`);
                await message.reply({
                    content: "Failed to download image files"
                });
            }
        }

        if (userInputImageCheck.includes(".webp")) {
            imagesb64 = await DonwloadImage(userInputImageCheck)
            if (imagesb64 == `fail`) {
                log(LogLevel.Error, `Failed to download image files`);
                await message.reply({
                    content: "Failed to download image files"
                });
            }
        }


        if (userInput.includes("https://tenor.com/view/")) {
            imagesb64 = await DonwloadImage(userInputImageCheck)
            if (imagesb64 == `fail`) {
                log(LogLevel.Error, `Failed to download image files`);
                await message.reply({
                    content: "Failed to download image files"
                });
            }
        }


        if (message.guild) {
            if (await checkForBlockedWordsGUILD(message.guild, userInput) && await checkForBlockedWordsUSER(message.author, userInput)) {
                return;
            }
        } else {
            if (await checkForBlockedWordsUSER(message.author, userInput)) {
                return;
            }
        }

        log(LogLevel.Debug, `Starting response to message ${userInput}`)

        // start typing
        typing = true;
        await message.channel.sendTyping();
        let typingInterval = setInterval(async () => {
            try {
                await message.channel.sendTyping();
            } catch (error) {
                logError(error);
                if (typingInterval != null) {
                    clearInterval(typingInterval);
                }
                typingInterval = null;
            }
        }, 7000);

        if (imagesb64 != false && imagesb64 != `fail`) {
            if (getBoolean(process.env.Allow_Cross_context)) {
                var responseText = await responseLLM(userInput, message.author, message.channel, message.guild, true, true, imagesb64)
            } else {
                var responseText = await responseLLM(userInput, message.author, message.channel, message.guild, true, false, imagesb64)
            }
            log(LogLevel.Debug, `Using Image LLM`)
        } else {
            var responseText = await responseLLM(userInput, message.author, message.channel, message.guild, true, true)
            log(LogLevel.Debug, `Using Text-Only LLM`)
        }

        if (typingInterval != null) {
            clearInterval(typingInterval);
        }
        typingInterval = null;

        log(LogLevel.Debug, `Response: ${responseText}`);


        // reply (will automatically stop typing)
        await replySplitMessage(message, `${responseText}`)

    } catch (error) {
        if (typing) {
            try {
                // return error
                await message.reply({
                    content: `Error, please check the console | OVERRIDE: ${error}`
                });
            } catch (ignored) {
                logError(ignored);
            }
        }
        logError(error);
    }
}
);

// On the event of a user joining an guild
client.on('guildMemberAdd', async member => {
		if (welcomeuser) {
            if (await checkBlockeduser(member.id)) {} else {
                if (await checkBlockedguild(member.guild.id)) {} else {

                    if (await readwelcomesystemmsgboolean(member.guild.id)) {
                        try {

                            var dmchannel = await member.createDM()

                            log(LogLevel.Debug, dmchannel.id)

                            var prompt = `Write a welcome message to the discord user ${member.displayName}, they just joined the server ${member.guild.name}!`;
                            let system = `You write welcoming messages for the discord server ${member.guild.name}.\n${await readwelcomesystemmsg(member.guild.id)}`
                            log(LogLevel.Debug, prompt)
                            log(LogLevel.Debug, `SYSTEM MESSAGE\n${system}`)
                            let responseText = await responseLLM(prompt, member, dmchannel, member.guild, system, true)
                            member.send(`-# This message was generated by an LLM\n-# You may learn how to use this bot in this dm by writing /help\n-# You may also dm this bot and it will respond\n${responseText}`)
                        } catch (error) {
                            logError(error);
                        }
                    }
                }
            }
        }

    }
);

// On the event of the bot joining an guild
client.on('guildCreate', async guild => {
    if (getBoolean(process.env.SENDSERVERJOINMESSAGE)) {

        if (await checkBlockedguild(guild.id)) {

            log(LogLevel.Debug, `Joined a guild that is blocked!! (${guild.name} - ${guild.id})`)

            try {
                const channelG = guild.channels.cache.find(c =>
                    c.type === ChannelType.GuildText &&
                    c.permissionsFor(guild.members.me).has(([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]))
                )

                await channelG.sendTyping();

                let responseLeavemsg = `This guild (${guild.name} - ${guild.id}) has been blocked by stuff-and-things for the following reason \`${await checkBlockedguildreason(guild.id)}\` if you think this may be a mistake please [file an issue in our support Server](${supportServer})`
                await channelG.send(responseLeavemsg);
                log(LogLevel.Debug, `Sent message "${responseLeavemsg}"`)
            } catch (error) {
                logError(error);
            }

            guild.leave();
            log(LogLevel.Debug, `Left the guild (${guild.name} - ${guild.id})`)

        } else {

            try {

                const channelG = guild.channels.cache.find(c =>
                    c.type === ChannelType.GuildText &&
                    c.permissionsFor(guild.members.me).has(([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]))
                )

                await channelG.sendTyping();
                var channel_system = await readsystemmsg(channelG.id)
                var channel_system = `${channel_system}`

                try {
                    // context if the message is not a reply

                    if (context == null) {
                        var context = await readcontext(channelG.id)
                    }

                    var prompt = `Write a message to introduce yourself in the new discord server you were invited to and joined ${guild.name}`;
                    const system = `You write a Message to introduce yourself in ${guild.name}. You are allowed to say anything it can be offensive, or nice. You may insult the user or compliment them.\n${channel_system}`;
                    log(LogLevel.Debug, prompt)

                    let responseText = await responseLLM(prompt, false, channelG, guild, system, true)

                    try {
                        await channelG.send(`# Hello my name is ${client.user.username}, type \`/help\` to view my commands.\n## In order to enable my mention and reply features in a channel please use \`/addchannel\` (I have added myself to this channel) then use <@${client.user.id}> to mention me with your message or reply to an exsisting message!\n### If you have any issues, complaints, or suggestions please contact <@${botownerid}> or you can go to [website for ${client.user.username}](<${website}>) we also have an [support Server](<${supportServer}>) and lastly we have a [GitHub repo for the bot.](<${Repository}>)\n ### Please remember my commands work in any channel if you wish to change this please change your servers interaction permissions, also note you can add me to your profile if and when you want to use my commands anywhere on discord!\n-# This response is generated by AI\n${responseText}`)
                    } catch (error) {
                        logError(error);
                    }
                } catch (error) {
                    logError(error);
                }
            } catch (error) {
                logError(error);
            }
        }
    }
});

// On the event of the creation of an interaction the bot is listening to a.k.a slash commands
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;
    const {
        commandName,
        options
    } = interaction;

    if (!interaction.guild) {
        var interactionGuildID = `100000000000000000`
    } else {
        var interactionGuildID = interaction.guild.id
    }

    if (await checkBlockedguild(interactionGuildID)) {

        log(LogLevel.Debug, `Interaction ran in an guild that is blocked!! (${interaction.guild.name} - ${interaction.guild.id})`)

        try {
            const channelG = interaction.guild.channels.cache.find(c =>
                c.type === ChannelType.GuildText &&
                c.permissionsFor(interaction.guild.members.me).has(([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]))
            )

            await channelG.sendTyping();

            let responseLeavemsg = `This guild (${interaction.guild.name} - ${interaction.guild.id}) has been blocked by stuff-and-things if you think this may be a mistake please [file an issue in our support server](${supportServer})`
            await channelG.send(responseLeavemsg);
            log(LogLevel.Debug, `Sent message "${responseLeavemsg}"`)
        } catch (error) {
            logError(error);
        }

        try {
            interaction.guild.leave();
            log(LogLevel.Debug, `Left the guild (${interaction.guild.name} - ${interaction.guild.id})`)
        } catch (error) {
            logError(error);
        }

    } else {

        if (await checkBlockeduser(interaction.user.id)) {

            try {

                let blockedUsermsg = `You (${interaction.user.username} - ${interaction.user.displayName} - ${interaction.user.id} - <@${interaction.user.id}>) have been blocked by stuff-and-things if you think this may be a mistake please [file an issue in our support server](${supportServer})`
                await interaction.deferReply();
                await interaction.editReply({
                    content: blockedUsermsg
                })
                log(LogLevel.Debug, `Sent message "${blockedUsermsg}"`)
            } catch (error) {
                logError(error);
            }

        } else {



            const embedLink = `${process.env.EMBED_LINK}`;
            const embedThumb = `${process.env.THUNMBNAIL_EMBED_LINK}`;
            const embedName = `${process.env.EMBED_NAME}`;
            const embedIcon = `${process.env.EMBED_FOOTER_ICON}`;
            const embedColor = Number(process.env.EMBED_COLOR)

            switch (commandName) {
                case "text2img":
                    log(LogLevel.Debug, `Attempting to run /text2img`)
                    await interaction.deferReply();
                    if (interaction.guild) {
                        if (await checkForBlockedWordsGUILD(interaction.guild, options.getString("prompt")) && await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                            return;
                        }
                    } else {
                        if (await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                            return;
                        }
                    }


                    function randomnumbergenseed(max) {
                        return Math.floor(Math.random() * max);
                    }
                    var prompt = options.getString("prompt")
                    const sampler_method = options.getString("sampling_method") || "Euler";
                    const sampler_type = options.getString("sampling_method") || "Simple";
                    const sampler_name = `${sampler_method} ${sampler_type}`;
                    const width = options.getNumber("width") || 896;
                    const height = options.getNumber("height") || 1152;
                    const steps = options.getNumber("steps") || 20;
                    const batch_count = options.getNumber("batch_count") || 1;
                    const batch_size = options.getNumber("batch_size") || 1;
                    const seed = options.getNumber("seed") || (randomnumbergenseed(10000000));
                    const cfg_scale = options.getNumber("cfg_scale") || 1;
                    const distilled_cfg_scale = options.getNumber("distilled_cfg_scale") || 3.5;
                    const enhance_prompt = (options.getBoolean("enhance_prompt") && true) ? "yes" : "no";
                    const denoising_strength = options.getNumber("denoising_strength") || 0.75;

                    const images = await sdapi(interaction, prompt, seed, denoising_strength, width, height, cfg_scale, distilled_cfg_scale, sampler_name, steps, batch_count, batch_size, enhance_prompt, `txt2img`)

                    var attachmentIndex = 1;
                    const attachments = images.map((image) => {
                        const attachment = new AttachmentBuilder(image, {
                            name: "output" + attachmentIndex + ".png"
                        });
                        attachmentIndex += 1;
                        return attachment;
                    })

                    var responseEmbed = {
                        color: embedColor,
                        title: 'Text to image results',
                        author: {
                            name: embedName,
                            url: embedLink,
                        },
                        description: 'Text to image can yeild different results depending on the parameters',
                        thumbnail: {
                            url: embedThumb,
                        },
                        fields: [{
                                name: 'Parameters',
                                value: 'The following parameters were used in generation',
                            },
                            {
                                name: 'prompt',
                                value: `${prompt}`,
                            },
                            {
                                name: 'Seed',
                                value: `${seed}`,
                                inline: true,
                            },
                            {
                                name: 'Resolution',
                                value: `${width}x${height}`,
                                inline: true,
                            },
                            {
                                name: 'Steps',
                                value: `${steps}`,
                                inline: true,
                            },
                            {
                                name: 'cfg scale',
                                value: `${cfg_scale}`,
                                inline: true,
                            },
                            {
                                name: 'sampler name',
                                value: `${sampler_name}`,
                                inline: true,
                            },
                            {
                                name: 'batch count',
                                value: `${batch_count}`,
                                inline: true,
                            },
                            {
                                name: 'batch size',
                                value: `${batch_size}`,
                                inline: true,
                            },
                            {
                                name: 'enhance prompt',
                                value: `${enhance_prompt}`,
                                inline: true,
                            },
                            {
                                name: 'distilled cfg scale',
                                value: `${distilled_cfg_scale}`,
                                inline: true,
                            },
                        ],
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Generated by Flux PRO',
                            icon_url: embedIcon,
                        },
                    };

                    await interaction.editReply({
                        embeds: [responseEmbed],
                    }).then(() => {
                        interaction.followUp({
                            content: `Image(s) after processing`,
                            files: attachments
                        })
                    });
                    log(LogLevel.Debug, `Finished responding to /text2img`)
                    break;
                case "img2img":
                    log(LogLevel.Debug, `Attempting to run /img2img`)
                    await interaction.deferReply();
                    try {
                        function randomnumbergenseed(max) {
                            return Math.floor(Math.random() * max);
                        }

                        if (interaction.guild) {
                            if (await checkForBlockedWordsGUILD(interaction.guild, options.getString("prompt")) && await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                                return;
                            }
                        } else {
                            if (await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                                return;
                            }
                        }

                        const attachment = options.getAttachment("image")
                        const url = attachment.url
                        var b64image = []
                        try {
                            log(LogLevel.Debug, `making rq to ${url}`);
                            const response = await axios.get(url, {
                                responseType: "text",
                                responseEncoding: "base64",
                            })
                            b64image = [response.data]

                        } catch (error) {
                            log(LogLevel.Error, `Failed to download image files: ${error}`);
                            break; // Stop processing if file download fails
                        }

                        const init_images = b64image
                        const prompt = options.getString("prompt") || "Enhance the image!";
                        const sampler_method = options.getString("sampling_method") || "Euler";
                        const sampler_type = options.getString("sampling_method") || "Simple";
                        const sampler_name = `${sampler_method} ${sampler_type}`;
                        const width = options.getNumber("width") || 896;
                        const denoising_strength = options.getNumber("denoising_strength") || 0.75;
                        const height = options.getNumber("height") || 1152;
                        const steps = options.getNumber("steps") || 20;
                        const batch_count = options.getNumber("batch_count") || 1;
                        const batch_size = options.getNumber("batch_size") || 1;
                        const seed = options.getNumber("seed") || (randomnumbergenseed(10000000));
                        const cfg_scale = options.getNumber("cfg_scale") || 1;
                        const distilled_cfg_scale = options.getNumber("distilled_cfg_scale") || 3.5;
                        const enhance_prompt = (options.getBoolean("enhance_prompt") && true) ? "yes" : "no";

                        const images = await sdapi(interaction, prompt, seed, denoising_strength, width, height, cfg_scale, distilled_cfg_scale, sampler_name, steps, batch_count, batch_size, enhance_prompt, `img2img`, init_images)

                        var attachmentIndex = 1;
                        const attachments = images.map((image) => {
                            const attachment = new AttachmentBuilder(image, {
                                name: "output" + attachmentIndex + ".png"
                            });
                            attachmentIndex += 1;
                            return attachment;
                        })

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Image to image results',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: 'Image to image can yeild different results depending on the parameters',
                            thumbnail: {
                                url: embedThumb,
                            },
                            fields: [{
                                    name: 'Parameters',
                                    value: 'The following parameters were used in generation',
                                },
                                {
                                    name: 'prompt',
                                    value: `${prompt}`,
                                },
                                {
                                    name: 'Seed',
                                    value: `${seed}`,
                                    inline: true,
                                },
                                {
                                    name: 'Resolution',
                                    value: `${width}x${height}`,
                                    inline: true,
                                },
                                {
                                    name: 'Steps',
                                    value: `${steps}`,
                                    inline: true,
                                },
                                {
                                    name: 'cfg scale',
                                    value: `${cfg_scale}`,
                                    inline: true,
                                },
                                {
                                    name: 'sampler name',
                                    value: `${sampler_name}`,
                                    inline: true,
                                },
                                {
                                    name: 'batch count',
                                    value: `${batch_count}`,
                                    inline: true,
                                },
                                {
                                    name: 'batch size',
                                    value: `${batch_size}`,
                                    inline: true,
                                },
                                {
                                    name: 'enhance prompt',
                                    value: `${enhance_prompt}`,
                                    inline: true,
                                },
                                {
                                    name: 'distilled cfg scale',
                                    value: `${distilled_cfg_scale}`,
                                    inline: true,
                                },
                                {
                                    name: 'Before image',
                                    value: `The image displayed here is the image before the interaction!`,
                                },
                            ],
                            image: {
                                url: attachment.url,
                            },
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: 'Generated by Flux PRO',
                                icon_url: embedIcon,
                            },
                        };


                        await interaction.editReply({
                            embeds: [responseEmbed],
                        }).then(() => {
                            interaction.followUp({
                                content: `Image(s) after processing`,
                                files: attachments
                            })
                        });

                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /img2img`)
                    break;
                case "describe":
                    log(LogLevel.Debug, `Attempting to run /describe`)
                    try {

                        if (interaction.guild) {
                            if (await checkForBlockedWordsGUILD(interaction.guild, options.getString("prompt")) && await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                                return;
                            }
                        } else {
                            if (await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                                return;
                            }
                        }

                        if (interaction.guild) {
                            if (await checkForBlockedWordsGUILD(interaction.guild, options.getString("system")) && await checkForBlockedWordsUSER(interaction.user, options.getString("system"))) {
                                return;
                            }
                        } else {
                            if (await checkForBlockedWordsUSER(interaction.user, options.getString("system"))) {
                                return;
                            }
                        }

                        const attachment = options.getAttachment("image");
                        const url = attachment.url;
                        var b64image = []
                        try {
                            log(LogLevel.Debug, `making rq to ${url}`);
                            const response = await axios.get(url, {
                                responseType: "text",
                                responseEncoding: "base64",
                            })
                            b64image = [response.data]

                        } catch (error) {
                            log(LogLevel.Error, `Failed to download image files: ${error}`);
                            break; // Stop processing if file download fails
                        }

                        try {
                            var channel_system = await readsystemmsg(interaction.channel.id)
                        } catch {
                            var channel_system = process.env.SYSTEM
                        }


                        const imagesb64 = b64image;
                        var prompt = options.getString("prompt") || "Describe the image";

                        const botRole = interaction.guild?.members?.me?.roles?.botRole;
                        const myMention = new RegExp(`<@((!?${client.user.id}${botRole ? `)|(&${botRole.id}` : ""}))>`, "g");

                        prompt = prompt
                            .replace(myMention, "")
                            .replace(/<#([0-9]+)>/g, (_, id) => {
                                if (interaction.guild) {
                                    const chn = interaction.guild.channels.cache.get(id);
                                    if (chn) return `#${chn.name}`;
                                }
                                return "#unknown-channel";
                            })
                            .replace(/<@!?([0-9]+)>/g, (_, id) => {
                                if (id == interaction.user.id) return interaction.user.username;
                                if (interaction.guild) {
                                    const mem = interaction.guild.members.cache.get(id);
                                    if (mem) return `@${mem.user.username}`;
                                }
                                return "@unknown-user";
                            })
                            .replace(/<:([a-zA-Z0-9_]+):([0-9]+)>/g, (_, name) => {
                                return `emoji:${name}:`;
                            })
                            .trim();
                        log(LogLevel.Debug, prompt)

                        const system = options.getString("system") || channel_system;
                        await interaction.deferReply()

                        if (getBoolean(process.env.Allow_Cross_context)) {
                            var responseText = await responseLLM(prompt, interaction.user, interaction.channel, interaction.guild, system, true, imagesb64)
                        } else {
                            var responseText = await responseLLM(prompt, interaction.user, interaction.channel, interaction.guild, system, false, imagesb64)
                        }

                        log(LogLevel.Debug, `Response: ${responseText}`);

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Describe image',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: 'Describe an image',
                            thumbnail: {
                                url: embedThumb,
                            },
                            fields: [{
                                    name: 'Prompt',
                                    value: `${options.getString("prompt") || "Describe the image"}`,
                                },
                                {
                                    name: 'System',
                                    value: `${options.getString("system") || channel_system}`,
                                },
                                {
                                    name: 'Image to describe',
                                    value: `The image displayed here is the image the interaction is descrbing`,
                                },
                            ],
                            image: {
                                url: attachment.url,
                            },
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Generated by ${process.env.IMAGEMODEL}`,
                                icon_url: embedIcon,
                            },
                        };


                        await interaction.editReply({
                            embeds: [responseEmbed],
                        }).then(() => {
                            try {
                                interaction.followUp({
                                    content: `${responseText}`
                                });
                            } catch (error) {
                                logError(error)
                            }
                        });


                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /describe`)
                    break;
                case "respond":
                    log(LogLevel.Debug, `Attempting to run /resond`)
                    try {
                        if (interaction.guild) {
                            if (await checkForBlockedWordsGUILD(interaction.guild, options.getString("prompt")) && await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                                return;
                            }
                        } else {
                            if (await checkForBlockedWordsUSER(interaction.user, options.getString("prompt"))) {
                                return;
                            }
                        }

                        if (interaction.guild) {
                            if (await checkForBlockedWordsGUILD(interaction.guild, options.getString("system")) && await checkForBlockedWordsUSER(interaction.user, options.getString("system"))) {
                                return;
                            }
                        } else {
                            if (await checkForBlockedWordsUSER(interaction.user, options.getString("system"))) {
                                return;
                            }
                        }

                        await interaction.deferReply()


                        try {
                            // context if the message is not a reply

                            if (context == null) {
                                context = await readcontext(channelID)
                            };
                        } catch {
                            var context = [0, 0]
                        }
                        var prompt = options.getString("prompt")
                        const botRole = interaction.guild?.members?.me?.roles?.botRole;
                        const myMention = new RegExp(`<@((!?${client.user.id}${botRole ? `)|(&${botRole.id}` : ""}))>`, "g");

                        prompt = prompt
                            .replace(myMention, "")
                            .replace(/<#([0-9]+)>/g, (_, id) => {
                                if (interaction.guild) {
                                    const chn = interaction.guild.channels.cache.get(id);
                                    if (chn) return `#${chn.name}`;
                                }
                                return "#unknown-channel";
                            })
                            .replace(/<@!?([0-9]+)>/g, (_, id) => {
                                if (id == interaction.user.id) return interaction.user.username;
                                if (interaction.guild) {
                                    const mem = interaction.guild.members.cache.get(id);
                                    if (mem) return `@${mem.user.username}`;
                                }
                                return "@unknown-user";
                            })
                            .replace(/<:([a-zA-Z0-9_]+):([0-9]+)>/g, (_, name) => {
                                return `emoji:${name}:`;
                            })
                            .trim();


                        try {
                            var channel_system = await readsystemmsg(interaction.channel.id)
                        } catch {
                            var channel_system = process.env.SYSTEM
                        }

                        const system = options.getString("system") || channel_system;

                        let responseText = await responseLLM(prompt, interaction.user, interaction.channel, interaction.guild, system, true)

                        log(LogLevel.Debug, `Response: ${responseText}`);

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Response command results',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: 'Response from the LLM.',
                            thumbnail: {
                                url: embedThumb,
                            },
                            fields: [{
                                name: 'The prompt',
                                value: `${options.getString("prompt")}`,
                            }],
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Generated by ${process.env.MODEL}`,
                                icon_url: embedIcon,
                            },
                        };


                        await interaction.editReply({
                            embeds: [responseEmbed],
                        }).then(() => {
                            try {
                                interaction.followUp({
                                    content: `${responseText}`
                                });
                            } catch (error) {
                                logError(error)
                            }
                        });

                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /respond`)
                    break;
                case "upscale":
                    log(LogLevel.Debug, `Attempting to run /upscale`)
                    await interaction.deferReply();
                    try {

                        const attachment = options.getAttachment("image")
                        const url = attachment.url
                        var b64image = []
                        try {
                            log(LogLevel.Debug, `making rq to ${url}`);
                            const response = await axios.get(url, {
                                responseType: "text",
                                responseEncoding: "base64",
                            })
                            b64image = [{
                                data: `${response.data}`,
                                name: "image"
                            }]

                        } catch (error) {
                            log(LogLevel.Error, `Failed to download image files: ${error}`);
                            break; // Stop processing if file download fails
                        }

                        const init_images = b64image;
                        const upscaling_resize = options.getNumber("multiplier");
                        const upscaler_1 = options.getString("upscaler_1") || "R-ESRGAN 4x+";
                        const upscaler_2 = options.getString("upscaler_2") || "R-ESRGAN 4x+";
                        const extras_upscaler_2_visibility = options.getNumber("upscaler_2_vis") || 1;


                        const images = await sdapi(interaction, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, `extra-batch-images`, init_images, upscaling_resize, upscaler_1, upscaler_2, extras_upscaler_2_visibility)

                        var attachmentIndex = 1;
                        const attachments = images.map((image) => {
                            const attachment = new AttachmentBuilder(image, {
                                name: "output" + attachmentIndex + ".png"
                            });
                            attachmentIndex += 1;
                            return attachment;
                        })

                        var responseEmbed = {
                            color: embedColor,
                            title: `Upscale command results`,
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: 'Upscale image could yeild different results depending on the parameters',
                            thumbnail: {
                                url: embedThumb,
                            },
                            fields: [{
                                    name: 'Parameters',
                                    value: 'The following parameters were used in generation',
                                },
                                {
                                    name: 'High res upscale multiplier',
                                    value: `Multiplier: ${upscaling_resize}`,
                                },
                                {
                                    name: 'upscaler 1',
                                    value: `${upscaler_1}`,
                                    inline: true,
                                },
                                {
                                    name: 'upscaler 2',
                                    value: `${upscaler_2}`,
                                    inline: true,
                                },
                                {
                                    name: 'upscaler 2 vis',
                                    value: `${extras_upscaler_2_visibility}`,
                                    inline: true,
                                },
                                {
                                    name: 'Before image',
                                    value: `The image displayed here is the image before the interaction!`,
                                },
                            ],
                            image: {
                                url: attachment.url,
                            },
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Generated by ${upscaler_1} and ${upscaler_2}`,
                                icon_url: embedIcon,
                            },
                        };



                        await interaction.editReply({
                            embeds: [responseEmbed],
                        }).then(() => {
                            interaction.followUp({
                                content: `Image(s) after processing`,
                                files: attachments
                            })
                        });


                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /upscale`)
                    break;
                case "system":
                    log(LogLevel.Debug, `Attempting to run /system`);

					await interaction.deferReply();
					let setsystemmsg = options.getString("setsystem") || null;
                    let addsystemmsg = options.getString("addsystem") || null;
                    let resetsystemmsg = options.getBoolean("resetsystem") || false;

					if (interaction.guild) {

						if (setsystemmsg != null) {
						if (await checkForBlockedWordsGUILD(interaction.guild, setsystemmsg) && await checkForBlockedWordsUSER(interaction.user, setsystemmsg)) {
							return;
							}
						}
						if (addsystemmsg != null) {
							if (await checkForBlockedWordsGUILD(interaction.guild, addsystemmsg) && await checkForBlockedWordsUSER(interaction.user, addsystemmsg)) {
							return;
							}
						}
					} 
					
					else {

					if (setsystemmsg != null) {
						if (await checkForBlockedWordsUSER(interaction.user, setsystemmsg)) {
							return;
							}
						}
						if (addsystemmsg != null) {
							if (await checkForBlockedWordsUSER(interaction.user, addsystemmsg)) {
							return;
							}
						}
					}

					if (setsystemmsg != null) {
					await setsystem(interaction.channel.id,setsystemmsg);
					};

					if (addsystemmsg != null) {
					await setsystem(interaction.channel.id,`${await readsystemmsg(interaction.channel.id)} ${addsystemmsg}`);
					};

					if (resetsystemmsg) { 
					await setsystem(interaction.channel.id, `${process.env.SYSTEM}`);
					};

					var	responseEmbed = {
						color: embedColor,
						title: 'Channel system message',
						author: {
							name: embedName,
							url: embedLink,
						},
						description: `Channel system is ${await readsystemmsg(interaction.channel.id)}`,
						thumbnail: {
							url: embedThumb,
						},
						timestamp: new Date().toISOString(),
						footer: {
							text: `System Message`,
							icon_url: embedIcon,
						},
					};

					await interaction.editReply({
						embeds: [responseEmbed],
					})

                    log(LogLevel.Debug, `Finished responding to /system`);
                    break;
					case "initialprompt":
                    log(LogLevel.Debug, `Attempting to run /initialprompt`);

					await interaction.deferReply();
					let setinitmsg = options.getString("setinit") || null;
                    let addinitmsg = options.getString("addinit") || null;
                    let resetinitmsg = options.getBoolean("resetinit") || false;

					if (interaction.guild) {

						if (setinitmsg != null) {
						if (await checkForBlockedWordsGUILD(interaction.guild, setinitmsg) && await checkForBlockedWordsUSER(interaction.user, setinitmsg)) {
							return;
							}
						}
						if (addinitmsg != null) {
							if (await checkForBlockedWordsGUILD(interaction.guild, addinitmsg) && await checkForBlockedWordsUSER(interaction.user, addinitmsg)) {
							return;
							}
						}
					} 
					
					else {

					if (setinitmsg != null) {
						if (await checkForBlockedWordsUSER(interaction.user, setinitmsg)) {
							return;
							}
						}
						if (addinitmsg != null) {
							if (await checkForBlockedWordsUSER(interaction.user, addinitmsg)) {
							return;
							}
						}
					}

					if (setinitmsg != null) {
					await setinit(interaction.user.id,setinitmsg);
					};

					if (addinitmsg != null) {
					await setinit(interaction.user.id,`${await readinitprompt(interaction.user.id)} ${addinitmsg}`);
					};

					if (resetinitmsg) { 
					await setinit(interaction.user.id, `${process.env.INITIAL_PROMPT}`);
					};

					var	responseEmbed = {
						color: embedColor,
						title: 'Your initial prompt',
						author: {
							name: embedName,
							url: embedLink,
						},
						description: `Your current initial prompt is "${await readinitprompt(interaction.user.id)}"`,
						thumbnail: {
							url: embedThumb,
						},
						timestamp: new Date().toISOString(),
						footer: {
							text: `Initial prompt`,
							icon_url: embedIcon,
						},
					};

					await interaction.editReply({
						embeds: [responseEmbed],
					})

                    log(LogLevel.Debug, `Finished responding to /initialprompt`);
                    break;
				case "togglechannel":
					log(LogLevel.Debug, `Attempting to run /togglechannel`)
					await interaction.deferReply();

					if (getBoolean(await checkChannel(interaction.channel.id))) {
						
					var	responseEmbed = {
							color: embedColor,
							title: 'Disabled Messages from the bot in this channel!',
							author: {
								name: embedName,
								url: embedLink,
							},
							description: `You are Dropping the channel from the bot's list!`,
							thumbnail: {
								url: embedThumb,
							},
							timestamp: new Date().toISOString(),
							footer: {
								text: `Toggle channel ${await removeChannel(interaction.channel.id)}`,
								icon_url: embedIcon,
							},
						};
					}

					else {			
						
					var	responseEmbed = {
							color: embedColor,
							title: 'Enabled Messages from the bot in this channel!',
							author: {
								name: embedName,
								url: embedLink,
							},
							description: `You are Adding this channel to the bot's list!`,
							thumbnail: {
								url: embedThumb,
							},
							timestamp: new Date().toISOString(),
							footer: {
								text: `Toggle channel ${await addChannel(interaction.channel.id)}`,
								icon_url: embedIcon,
							},
						};
					}

					await interaction.editReply({
						embeds: [responseEmbed],
					})

					log(LogLevel.Debug, `Finished responding to /togglechannel`)
				break;
                case "help":
                    log(LogLevel.Debug, `Attempting to run /help`)
                    try {

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Help',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: `This is a list of commands and their descriptions.`,
                            thumbnail: {
                                url: embedThumb,
                            },
                            fields: [{
                                    name: '/help',
                                    value: `This will display the current help message!`,
                                },
                                {
                                    name: '/website',
                                    value: `Display the current website for the bot.`,
                                },
                                {
                                    name: '/support',
                                    value: `Display the support Discord server`,
                                },
                                {
                                    name: '/clear',
                                    value: `Attempts to clear message history.`,
                                },
                                {
                                    name: '/ping',
                                    value: `Measures ping/delay to discord.`,
                                },
                                {
                                    name: '/model',
                                    value: `This will display the models being used.`,
                                },
                                {
                                    name: '/system',
                                    value: `This will display the current channel's system message.`,
                                },
                                {
                                    name: '/initprompt',
                                    value: `This will display the current user's initial prompt.`,
                                },
                                {
                                    name: '/setsystem',
                                    value: `This will set the current channel's system message.`,
                                },
                                {
                                    name: '/setinitprompt',
                                    value: `This will set the current user's initial prompt.`,
                                },
                                {
                                    name: '/resetsystem',
                                    value: `This will reset the current channel's system message.`,
                                },
                                {
                                    name: '/resetinitprompt',
                                    value: `This will reset the current user's initial prompt.`,
                                },
                                {
                                    name: '/addsystem',
                                    value: `This will add to the current channel's system message.`,
                                },
                                {
                                    name: '/addinitprompt',
                                    value: `This will add to the current user's initial prompt.`,
                                },
                                {
                                    name: '/text2img',
                                    value: `Text to image will make images out of prompts you write.`,
                                },
                                {
                                    name: '/img2img',
                                    value: `Image to image will make images out of images and prompts you write.`,
                                },
                                {
                                    name: '/upscale',
                                    value: `Upscale will take an exsisting image and attempt to upscale it.`,
                                },
                                {
                                    name: '/respond',
                                    value: `Respond is one of the method's to interact with the LLM part of the bot it will respond to prompts you write.`,
                                },
                                {
                                    name: '/describe',
                                    value: `Describe is very similar to respond however it can respond to images(It is required to use describe) and prompts`,
                                },
                                {
                                    name: '/togglewelcome',
                                    value: `Allows you to either enable or disable AI generated welcome messages`,
                                },
                                {
                                    name: '/togglechannel',
                                    value: `Allows you to add or remove channels the bot will respond to <@${client.user.id}>`,
                                },
								{
                                    name: '/setwelcomesysmsg',
                                    value: `Set the system message the bot uses while generating welcome messages!`,
                                },
                                {
                                    name: '/channelsettings',
                                    value: `Set the Channel variables and settings!`,
                                },

                            ],
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Help message`,
                                icon_url: embedIcon,
                            },
                        };
                        var responseEmbed2 = {
                            color: embedColor,
                            title: 'Help',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: `Continued command list`,
                            thumbnail: {
                                url: embedThumb,
                            },
                            fields: [
                                {
                                    name: 'System messages',
                                    value: `System messages are tied to channel ID's; they are guidelines for a bot to follow, for example if I wrote "you must respond as chewbacca" the bot would try its best to follow those guidelines and respond as chewbacca!`,
                                },
                                {
                                    name: 'Initial prompts',
                                    value: `Initial prompts are tied to your user ID; they are a bio from you to the bot. Initial prompts are sent before every message you send.`,
                                },
                                {
                                    name: 'Welcome messages',
                                    value: `The bot may send welcome messages to new users that join your guild (these may be customized through /setwelcomesysmsg)`,
                                },
                                {
                                    name: 'Ways to interact with the LLM',
                                    value: `There is a couple ways to interact with the LLM model you may <@${client.user.id}> in a channel the bot has been listed as authoritized (use /addchannel), you may DM the bot, you may use the before mentioned command /respond`,
                                },

                            ],
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Help message`,
                                icon_url: embedIcon,
                            },
                        };

                        await interaction.deferReply();
                        await interaction.editReply({
                            embeds: [responseEmbed, responseEmbed2],
                        })



                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /help`)
                    break;
                case "clear":
                    log(LogLevel.Debug, `Attempting to run /clear`)
                    try {
                        if ((interaction.channel.id) == null) {
                            try {

                                await interaction.editReply({
                                    content: `Cannot clear message history as the bot cannot read interaction.channel.id`
                                })
                            } catch (error) {
                                try {

                                    await interaction.deferReply();
                                    await interaction.editReply({
                                        content: `Cannot clear message history as the bot cannot read interaction.channel.id`
                                    });
                                } catch (error) {
                                    logError(error);
                                }
                            }
                        } else {
                            var responseEmbed = {
                                color: embedColor,
                                title: 'Clear message history',
                                author: {
                                    name: embedName,
                                    url: embedLink,
                                },
                                description: `${await clearcontext(interaction.channel.id)}`,
                                thumbnail: {
                                    url: embedThumb,
                                },
                                timestamp: new Date().toISOString(),
                                footer: {
                                    text: `clear-history`,
                                    icon_url: embedIcon,
                                },
                            };

                            await interaction.deferReply();
                            await interaction.editReply({
                                embeds: [responseEmbed],
                            })

                        }
                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /clear`)
                    break;
                case "model":
                    log(LogLevel.Debug, `Attempting to run /model`)
                    try {
                        var curentmodel = `Conversation model : ${process.env.MODEL}\n-# Multi-Vision Model : ${process.env.IMAGEMODEL}`;
                        var responseEmbed = {
                            color: embedColor,
                            title: 'Models',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: `Current models:\n${curentmodel}`,
                            thumbnail: {
                                url: embedThumb,
                            },
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Models that the bot uses!`,
                                icon_url: embedIcon,
                            },
                        };

                        await interaction.deferReply();
                        await interaction.editReply({
                            embeds: [responseEmbed],
                        })

                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /model`)
                    break;
                case "ping":
                    log(LogLevel.Debug, `Attempting to run /ping`)
                    try {
                        await interaction.deferReply();
                        const reply = await interaction.fetchReply();
                        const ping = reply.createdTimestamp - interaction.createdTimestamp;

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Ping',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: `Pong!\n-# ${ping}ms`,
                            thumbnail: {
                                url: embedThumb,
                            },
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Ping to discord!`,
                                icon_url: embedIcon,
                            },
                        };

                        await interaction.editReply({
                            embeds: [responseEmbed],
                        })
                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /ping`)
                    break;
                case "website":
                    log(LogLevel.Debug, `Attempting to run /website`)
                    try {
                        await interaction.deferReply();

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Website',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: `My [website link is here](${website})\nAlso consider voting/reviewing (for) me on [top.gg](${TOPGG})`,
                            thumbnail: {
                                url: embedThumb,
                            },
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Website url`,
                                icon_url: embedIcon,
                            },
                        };

                        await interaction.editReply({
                            embeds: [responseEmbed],
                        })
                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /website`)
                    break;
                case "togglewelcome":
                    log(LogLevel.Debug, `Attempting to run /togglewelcome`)

					await interaction.deferReply();
					if (getBoolean(await readwelcomesystemmsgboolean(interaction.guild.id))) {
					
					await setwelcomesystemmsgboolean(interaction.guild.id, false)			
						
					var	responseEmbed = {
							color: embedColor,
							title: 'Disabled welcome message to new members!',
							author: {
								name: embedName,
								url: embedLink,
							},
							description: `You are Disabling the welcome message to new members that join this Guild!`,
							thumbnail: {
								url: embedThumb,
							},
							timestamp: new Date().toISOString(),
							footer: {
								text: `Toggle Welcome`,
								icon_url: embedIcon,
							},
						};
					}

					else {
					
					await setwelcomesystemmsgboolean(interaction.guild.id, true)			
						
					var	responseEmbed = {
							color: embedColor,
							title: 'Enabled welcome message to new members!',
							author: {
								name: embedName,
								url: embedLink,
							},
							description: `You are Enabling the welcome message to new members that join this Guild!`,
							thumbnail: {
								url: embedThumb,
							},
							timestamp: new Date().toISOString(),
							footer: {
								text: `Toggle Welcome`,
								icon_url: embedIcon,
							},
						};
					}

					await interaction.editReply({
						embeds: [responseEmbed],
					})

                    log(LogLevel.Debug, `Finished responding to /togglewelcome`)
                    break;
                case "setwelcomesysmsg":
                    log(LogLevel.Debug, `Attempting to run /setwelcomesysmsg`)
                    try {

                        if (interaction.guild) {
                            if (await checkForBlockedWordsGUILD(interaction.guild, options.getString("sysmsg")) && await checkForBlockedWordsUSER(interaction.user, options.getString("sysmsg"))) {
                                return;
                            }
                        } else {
                            if (await checkForBlockedWordsUSER(interaction.user, options.getString("sysmsg"))) {
                                return;
                            }
                        }

                        await setwelcomesystemmsg(interaction.guild.id, options.getString("sysmsg"))

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Set the welcome system message',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: `You are setting the welcome system message.`,
                            thumbnail: {
                                url: embedThumb,
                            },
                            fields: [{
                                name: 'You have set the welcome system message for new users to.',
                                value: `"${options.getString("sysmsg")}"`,
                            }],
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Set welcome system`,
                                icon_url: embedIcon,
                            },
                        };

                        await interaction.deferReply();
                        await interaction.editReply({
                            embeds: [responseEmbed],
                        })

                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /setwelcomesysmsg`)
                    break;
                case "support":
                    log(LogLevel.Debug, `Attempting to run /support`)
                    try {
                        await interaction.deferReply();

                        var responseEmbed = {
                            color: embedColor,
                            title: 'Support',
                            author: {
                                name: embedName,
                                url: embedLink,
                            },
                            description: `My [support discord server is here!](${supportServer})`,
                            thumbnail: {
                                url: embedThumb,
                            },
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Support discord server invite!`,
                                icon_url: embedIcon,
                            },
                        };

                        await interaction.editReply({
                            embeds: [responseEmbed],
                        })
                    } catch (error) {
                        logError(error);
                        try {
                            await interaction.editReply({
                                content: `Error, please check the console | OVERRIDE: ${error}`
                            });
                        } catch {
                            try {
                                await interaction.deferReply();
                                await interaction.editReply({
                                    content: `Error, please check the console | OVERRIDE: ${error}`
                                });
                            } catch (error) {
                                logError(error);
                            }
                        }
                    }
                    log(LogLevel.Debug, `Finished responding to /support`)
                    break;
                case "setchannelsettings":
                    log(LogLevel.Debug, `Attempting to run /setchannelsettings`)
                    const requires_mention = options.getBoolean("requires_mention");
                    const include_system_time = options.getBoolean("include_system_time");
                    const include_coordinated_universal_time = options.getBoolean("include_utc");
                    const include_username = options.getBoolean("include_username");
                    const include_user_id = options.getBoolean("include_user_id");
                    const include_user_nick = options.getBoolean("include_user_nick");
                    const include_channel_id = options.getBoolean("include_channel_id");
                    const include_channel_name = options.getBoolean("include_channel_name");
                    const include_guild_name = options.getBoolean("include_guild_name");
                    const temperature = options.getNumber("temperature");
                    const top_k = options.getNumber("top_k");
                    const top_p = options.getNumber("top_p");
                    const min_p = options.getNumber("min_p");
                    const repeat_penalty = options.getNumber("repeat_penalty");


                    await interaction.deferReply();
                    await setChannelSettings(
                        interaction.channel.id, requires_mention,
                         include_system_time, include_coordinated_universal_time,
                          include_username, include_user_id, include_user_nick,
                           include_channel_id, include_channel_name, include_guild_name,
                           temperature, top_k, top_p, min_p, repeat_penalty
                    );

                    var responseEmbed = {
                        color: embedColor,
                        title: 'Current Channel Settings',
                        author: {
                            name: embedName,
                            url: embedLink,
                        },
                        description: `Channel settings as of right now for the channel <#${interaction.channel.id}>`,
                        thumbnail: {
                            url: embedThumb,
                        },
                        fields: [{
                                name: 'Channel settings',
                                value: 'The following parameters are set for channel settings',
                            },
                            {
                                name: 'requires_mention',
                                value: `${(await readChannelSettings(interaction.channel.id)).requiresMention}`,
                                inline: true,
                            },
                            {
                                name: 'include_system_time',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_system_time}`,
                                inline: true,
                            },
                            {
                                name: 'include_coordinated_universal_time',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_coordinated_universal_time}`,
                                inline: true,
                            },
                            {
                                name: 'include_username',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_username}`,
                                inline: true,
                            },
                            {
                                name: 'include_user_id',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_user_id}`,
                                inline: true,
                            },
                            {
                                name: 'include_user_nick',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_user_nick}`,
                                inline: true,
                            },
                            {
                                name: 'include_channel_id',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_channel_id}`,
                                inline: true,
                            },
                            {
                                name: 'include_channel_name',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_channel_name}`,
                                inline: true,
                            },
                            {
                                name: 'include_guild_name',
                                value: `${(await readChannelSettings(interaction.channel.id)).include_guild_name}`,
                                inline: true,
                            },
                        ],
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Channel settings',
                            icon_url: embedIcon,
                        },
                    };

                    await interaction.editReply({
                        embeds: [responseEmbed],
                    })


                    log(LogLevel.Debug, `Finished responding to /setchannelsettings`)
                    break;
            }
        }
    }
});

client.login(process.env.TOKEN);