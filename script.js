const telegramBotToken = "6923582894:AAHuYGsJuKLsKCcVccnN8kbsdRzC8vTiFVE";
const chatId = "558625598"; 
class FirebaseManager {
    constructor() {
        // Инициализация Firebase
        firebase.initializeApp({
            apiKey: "AIzaSyC04K2xwoat05QTXxJeb9f-hYXcjUBae0A",
            authDomain: "simple-blog-ayojxo.firebaseapp.com",
            projectId: "simple-blog-ayojxo",
            storageBucket: "simple-blog-ayojxo.appspot.com",
            messagingSenderId: "504207144426",
            appId: "1:504207144426:web:e9be92cff23c73b5056e93",
            databaseURL: "https://simple-blog-ayojxo-default-rtdb.europe-west1.firebasedatabase.app" 
        });

        this.auth = firebase.auth();
        this.database = firebase.database();
        this.lastMessageSentFromSite = ''; // Переменная для хранения последнего сообщения, отправленного с сайта
    }

    async registerAnonymousUser() {
        try {
            const currentUser = this.auth.currentUser;

            if (!currentUser || !currentUser.isAnonymous) {
                await this.auth.signInAnonymously();
                return true;
            }

            return false; // Пользователь уже анонимно аутентифицирован
        } catch (error) {
            console.error('Ошибка регистрации анонимного пользователя:', error);
            return false;
        }
    }

    isUserRegistered() {
        const currentUser = this.auth.currentUser;
        return currentUser && currentUser.isAnonymous;
    }

    async sendMessage(message, repliedMessageUID, recipientUID) {
        try {
            const currentUser = this.auth.currentUser;
    
            if (!currentUser) {
                console.error('Пользователь не аутентифицирован.');
                return;
            }
    
            // Формируем путь к сообщениям текущего пользователя
            const userMessagesRef = this.database.ref('users').child(currentUser.uid).child('messages');
    
            // Записываем сообщение в Realtime Database
            const messageData = {
                uid: currentUser.uid, // Добавляем UID пользователя в сообщение
                message: message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
    
            // Если есть цитируемое сообщение, добавляем его UID
            if (repliedMessageUID) {
                messageData.repliedMessageUID = repliedMessageUID;
            }
    
            await userMessagesRef.push(messageData);
    
            console.log('Сообщение успешно отправлено в Realtime Database.');
    
            // Отправляем сообщение в Telegram
            await this.sendTelegramMessage(`UID: ${currentUser.uid}\n${message}`);
    
            // Обновляем сообщения на странице, только если это сообщение адресовано конкретному пользователю
            if (recipientUID) {
                console.log('Отмечаем сообщение как отправленное');
                this.updateMessagesOnPage(message, recipientUID, true); // Помечаем сообщение как отправленное
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
        }
    }
    async sendTelegramMessage(message) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message
                })
            });

            const responseData = await response.json();
            if (!responseData.ok) {
                throw new Error(responseData.description);
            }

            console.log('Сообщение успешно отправлено в Telegram.');
        } catch (error) {
            console.error('Ошибка отправки сообщения в Telegram:', error);
        }
    }
    
// Метод для обновления сообщений на странице
// Метод для обновления сообщений на странице
updateMessagesOnPage(message, uid, isSentMessage) {
    console.log('Обновляем сообщения на странице');
    // Проверяем, есть ли UID у пользователя
    if (uid) {
        const messagesContainer = document.getElementById('messagesContainer');
        const currentTime = new Date().toLocaleTimeString();
        const userDisplayName = `Менеджер`;
        const formattedMessage = `${currentTime}, ${userDisplayName}: ${message}`;
        const newMessageElement = document.createElement('div');
        newMessageElement.textContent = formattedMessage;

        // Добавляем класс "sent-message" для отправленных сообщений
        if (isSentMessage) {
            console.log('Добавляем класс sent-message');
            newMessageElement.classList.add('sent-message');
        } else {
            // Добавляем класс "received-message" для полученных сообщений
            console.log('Добавляем класс received-message');
            newMessageElement.classList.add('received-message');
        }

        messagesContainer.appendChild(newMessageElement);
    }
}



// Метод для проверки, было ли сообщение отправлено пользователем с сайта
messageSentFromSite(message, uid) {
    const messages = document.getElementById('messagesContainer').getElementsByTagName('div');
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].textContent.includes(message) && messages[i].textContent.includes(uid)) {
            return true;
        }
    }
    return false;
}

}

// Инициализация FirebaseManager
const firebaseManager = new FirebaseManager();

// Проверяем, зарегистрирован ли пользователь анонимно при загрузке страницы
window.addEventListener('load', async () => {
    if (!firebaseManager.isUserRegistered()) {
        await firebaseManager.registerAnonymousUser();
    }
});

// Обработчик отправки формы сообщения на сайте
document.getElementById('messageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput').value.trim();
    if (messageInput !== '') {
        const newMessageElement = document.createElement('div');
        newMessageElement.textContent = `Вы отправили: ${messageInput}`;
        newMessageElement.classList.add('message', 'sent-message'); // Добавляем классы сообщению
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.appendChild(newMessageElement);

        document.getElementById('messageInput').value = '';
        
        // Отправляем сообщение через FirebaseManager
        await firebaseManager.sendMessage(messageInput);
    }
});
// Обработчик отправки сообщения при нажатии клавиши Enter
document.getElementById('messageInput').addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Предотвращаем стандартное поведение формы (отправку по Enter)
        const messageInput = document.getElementById('messageInput').value.trim();
        if (messageInput !== '') {
            const newMessageElement = document.createElement('div');
            newMessageElement.textContent = `Вы отправили: ${messageInput}`;
            newMessageElement.classList.add('message', 'sent-message'); // Добавляем классы сообщению
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.appendChild(newMessageElement);

            document.getElementById('messageInput').value = '';

            // Отправляем сообщение через FirebaseManager
            await firebaseManager.sendMessage(messageInput);
        }
    }
});

// Функция для прокручивания контейнера сообщений вниз
function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Наблюдатель за изменениями в контейнере сообщений
const messagesObserver = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
            scrollToBottom(); // Прокручиваем вниз при добавлении нового элемента
        }
    });
});

// Начинаем наблюдение за контейнером сообщений
const messagesContainer = document.getElementById('messagesContainer');
messagesObserver.observe(messagesContainer, { childList: true });

// Обработчик открытия и закрытия чата
const openChatButton = document.getElementById('openChatButton');
const closeChatButton = document.getElementById('closeChatButton');
const chatContainer = document.querySelector('.chat-container');

openChatButton.addEventListener('click', () => {
    chatContainer.style.display = 'block';
});

closeChatButton.addEventListener('click', () => {
    chatContainer.style.display = 'none';
});

// Функция для отправки сообщения через FirebaseManager
async function sendMessageThroughFirebase(message) {
    await firebaseManager.sendMessage(message);
}

// Функция для отправки сообщения через Telegram
async function sendTelegramMessage(message) {
    await firebaseManager.sendTelegramMessage(message);
}
async function startPolling() {
    try {
        let offset = 0;
        while (true) {
            const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${offset}&timeout=30`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const responseData = await response.json();
            if (responseData.ok) {
                const updates = responseData.result;
                if (updates.length > 0) {
                    updates.forEach(update => {
                        const message = update.message;
                        if (message) {
                            const text = message.text;
                            const chatId = message.chat.id;
                            const messageId = message.message_id;
                            const repliedMessage = message.reply_to_message;
                            let repliedMessageUID = null;
                            if (repliedMessage) {
                                repliedMessageUID = repliedMessage.from.id;
                            }

                            // Отправляем сообщение только если оно не из Телеграма
                            if (repliedMessageUID !== null) {
                                // Отправляем ответ на цитируемое сообщение
                                firebaseManager.sendMessage(text, chatId === repliedMessage.chat.id ? repliedMessageUID : message.from.id)
                                    .then(() => {
                                        firebaseManager.updateMessagesOnPage(text, repliedMessageUID);
                                    })
                                    .catch(error => {
                                        console.error('Ошибка отправки сообщения:', error);
                                    });
                            } else {
                                // Если сообщение из Телеграма, просто обновляем его на странице
                                firebaseManager.updateMessagesOnPage(text, null, false);
                            }
                        }
                        offset = update.update_id + 1;
                    });
                }
            }
            await new Promise(resolve => setTimeout(resolve, 500)); // Добавляем небольшую задержку между запросами, чтобы не перегрузить сервер
        }
    } catch (error) {
        console.error('Ошибка при выполнении Long Polling:', error);
    }
}

// Запускаем Long Polling при загрузке страницы
startPolling();