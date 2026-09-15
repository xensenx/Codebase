(async () => {
    "use strict";

    /*
     * ============================================================
     * ChatGPT Single Conversation Exporter
     * ============================================================
     *
     * Paste directly into the DevTools Console while viewing:
     *
     *     https://chatgpt.com/c/<conversation-id>
     *
     * The script:
     *
     *   1. Gets the current conversation ID from the URL.
     *   2. Gets the current ChatGPT access token automatically.
     *   3. Requests the conversation directly from the backend.
     *   4. Handles pagination.
     *   5. Extracts USER and CHATGPT messages.
     *   6. Preserves the complete message text.
     *   7. Downloads a .txt transcript.
     *
     * It does NOT scrape the rendered webpage.
     * Therefore "Show more" does not matter.
     */

    // ------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------

    const PAGE_SIZE = 100;
    const REQUEST_DELAY = 400;

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));


    // ------------------------------------------------------------
    // 1. Get conversation ID
    // ------------------------------------------------------------

    const match =
        location.pathname.match(
            /\/c\/([a-f0-9-]+)/i
        );

    if (!match) {
        throw new Error(
            "Could not determine the conversation ID from the URL."
        );
    }

    const conversationId = match[1];

    console.log(
        "[Exporter] Conversation ID:",
        conversationId
    );


    // ------------------------------------------------------------
    // 2. Get ChatGPT access token
    // ------------------------------------------------------------

    console.log(
        "[Exporter] Getting ChatGPT access token..."
    );

    const sessionResponse =
        await fetch(
            "/api/auth/session",
            {
                method: "GET",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

    if (!sessionResponse.ok) {
        throw new Error(
            `Could not obtain ChatGPT session: HTTP ${sessionResponse.status}`
        );
    }

    const session =
        await sessionResponse.json();

    const accessToken =
        session?.accessToken;

    if (!accessToken) {
        console.error(
            "[Exporter] Session response:",
            session
        );

        throw new Error(
            "ChatGPT did not provide an access token. Try refreshing the page and running the script again."
        );
    }

    console.log(
        "[Exporter] Access token obtained."
    );


    // ------------------------------------------------------------
    // 3. Device ID
    // ------------------------------------------------------------

    const deviceId =
        crypto.randomUUID();


    // ------------------------------------------------------------
    // 4. Fetch one conversation page
    // ------------------------------------------------------------

    async function fetchConversationPage(before = null) {

        const params =
            new URLSearchParams();

        params.set(
            "include_has_versions",
            "true"
        );

        params.set(
            "num_turns",
            String(PAGE_SIZE)
        );

        if (before) {
            params.set(
                "before",
                before
            );
        }

        const url =
            `/backend-api/conversations/${conversationId}?${params.toString()}`;

        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    credentials: "include",

                    headers: {
                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${accessToken}`,

                        "Oai-Device-Id":
                            deviceId,

                        "Oai-Language":
                            "en-US",

                        "x-openai-target-route":
                            `/backend-api/conversations/${conversationId}`
                    }
                }
            );

        console.log(
            `[Exporter] GET → ${response.status}`
        );

        if (!response.ok) {

            let errorText = "";

            try {
                const errorData =
                    await response.clone().json();

                errorText =
                    JSON.stringify(
                        errorData
                    );

            } catch {

                try {
                    errorText =
                        await response.clone().text();

                } catch {
                    errorText = "";
                }
            }

            throw new Error(
                `Conversation request failed: HTTP ${response.status}` +
                (
                    errorText
                        ? ` — ${errorText}`
                        : ""
                )
            );
        }

        return await response.json();
    }


    // ------------------------------------------------------------
    // 5. Extract message text
    // ------------------------------------------------------------

    function extractMessageText(message) {

        if (!message) {
            return "";
        }

        const content =
            message.content;

        if (!content) {
            return "";
        }


        // Normal ChatGPT text messages

        if (
            Array.isArray(
                content.parts
            )
        ) {

            return content.parts
                .map(part => {

                    if (
                        typeof part ===
                        "string"
                    ) {
                        return part;
                    }

                    if (
                        part &&
                        typeof part ===
                        "object"
                    ) {

                        if (
                            typeof part.text ===
                            "string"
                        ) {
                            return part.text;
                        }

                        if (
                            typeof part.content ===
                            "string"
                        ) {
                            return part.content;
                        }
                    }

                    return "";

                })
                .filter(Boolean)
                .join("\n");
        }


        // Alternate text representation

        if (
            typeof content.text ===
            "string"
        ) {
            return content.text;
        }


        // Extremely old / unusual format

        if (
            typeof content ===
            "string"
        ) {
            return content;
        }

        return "";
    }


    // ------------------------------------------------------------
    // 6. Determine message role
    // ------------------------------------------------------------

    function getRole(message) {

        const role =
            message?.author?.role ||
            message?.role ||
            "";

        switch (
            role.toLowerCase()
        ) {

            case "user":
                return "USER";

            case "assistant":
                return "CHATGPT";

            default:
                return null;
        }
    }


    // ------------------------------------------------------------
    // 7. Download all conversation pages
    // ------------------------------------------------------------

    console.log(
        "[Exporter] Fetching conversation..."
    );

    const messages = [];

    const seen =
        new Set();

    let before = null;
    let page = 0;

    while (true) {

        page++;

        console.log(
            `[Exporter] Fetching page ${page}...`
        );

        const data =
            await fetchConversationPage(
                before
            );

        if (
            !Array.isArray(
                data.messages
            )
        ) {

            console.error(
                "[Exporter] Unexpected response:",
                data
            );

            throw new Error(
                "The API response does not contain messages[]."
            );
        }

        console.log(
            `[Exporter] Received ${data.messages.length} messages.`
        );


        // Add messages while avoiding duplicates

        for (
            const message
            of data.messages
        ) {

            if (!message) {
                continue;
            }

            const id =
                message.id ||
                `${message.create_time}-${messages.length}`;

            if (
                seen.has(id)
            ) {
                continue;
            }

            seen.add(id);

            messages.push(
                message
            );
        }


        // Pagination information

        const pageInfo =
            data.page_info ||
            {};

        const hasPrevious =
            pageInfo.has_previous_page === true;

        const nextCursor =
            pageInfo.start_cursor;


        if (
            !hasPrevious ||
            !nextCursor ||
            nextCursor === before
        ) {

            break;
        }

        before =
            nextCursor;

        await sleep(
            REQUEST_DELAY
        );
    }


    console.log(
        `[Exporter] Total unique messages: ${messages.length}`
    );


    // ------------------------------------------------------------
    // 8. Sort chronologically
    // ------------------------------------------------------------

    messages.forEach(
        (message, index) => {
            message.__exportIndex =
                index;
        }
    );

    messages.sort(
        (a, b) => {

            const timeA =
                typeof a.create_time ===
                "number"
                    ? a.create_time
                    : Number.MAX_SAFE_INTEGER;

            const timeB =
                typeof b.create_time ===
                "number"
                    ? b.create_time
                    : Number.MAX_SAFE_INTEGER;

            if (
                timeA !== timeB
            ) {
                return timeA - timeB;
            }

            return (
                a.__exportIndex -
                b.__exportIndex
            );
        }
    );


    // ------------------------------------------------------------
    // 9. Build transcript
    // ------------------------------------------------------------

    const transcript =
        [];

    for (
        const message
        of messages
    ) {

        const role =
            getRole(message);

        /*
         * Ignore system, tool, and internal
         * messages.
         */

        if (!role) {
            continue;
        }

        const text =
            extractMessageText(
                message
            );

        if (
            !text ||
            !text.trim()
        ) {
            continue;
        }

        transcript.push(
            `${role}:\n${text.trim()}`
        );
    }


    if (
        transcript.length === 0
    ) {

        throw new Error(
            "No USER/CHATGPT messages were found."
        );
    }


    // ------------------------------------------------------------
    // 10. Conversation title
    // ------------------------------------------------------------

    let title =
        document.title
            .replace(
                /\s*[-|]\s*ChatGPT.*$/i,
                ""
            )
            .trim();

    if (!title) {
        title =
            "ChatGPT Conversation";
    }


    // ------------------------------------------------------------
    // 11. Build final transcript
    // ------------------------------------------------------------

    const separator =
        "\n\n" +
        "============================================================" +
        "\n\n";

    const output =
        [
            title,

            `Conversation ID: ${conversationId}`,

            `Exported: ${new Date().toISOString()}`,

            `Messages: ${transcript.length}`,

            "",

            "============================================================",

            "",

            transcript.join(
                separator
            )
        ].join("\n");


    // ------------------------------------------------------------
    // 12. Download file
    // ------------------------------------------------------------

    const safeTitle =
        title
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                "_"
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .slice(
                0,
                120
            ) ||
        "ChatGPT_Conversation";

    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            )
            .replace(
                "T",
                "_"
            )
            .replace(
                "Z",
                ""
            );

    const filename =
        `${safeTitle}_${timestamp}.txt`;

    const blob =
        new Blob(
            [output],
            {
                type:
                    "text/plain;charset=utf-8"
            }
        );

    const downloadUrl =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        downloadUrl;

    link.download =
        filename;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    setTimeout(
        () =>
            URL.revokeObjectURL(
                downloadUrl
            ),
        10000
    );


    // ------------------------------------------------------------
    // 13. Done
    // ------------------------------------------------------------

    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        "[Exporter] EXPORT COMPLETE"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "[Exporter] Title:",
        title
    );

    console.log(
        "[Exporter] Messages:",
        transcript.length
    );

    console.log(
        "[Exporter] File:",
        filename
    );

})();
