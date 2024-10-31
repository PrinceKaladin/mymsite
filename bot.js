const axios = require('axios');
async function getImageBase64(url) {
 
   try{   // Загружаем изображение как массив байтов
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      
      // Конвертируем байты в строку Base64
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      
      // Возвращаем строку Base64
      return base64Image;
   }catch{
    return "";
   }
}
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, child } = require("firebase/database");
const firebaseConfig = {
  apiKey: "AIzaSyBEuWHhTt7YD-3_vOXlVdu0LzTm4e95rm0",
  authDomain: "rocketvoy.firebaseapp.com",
  databaseURL: "https://rocketvoy-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "rocketvoy",
  storageBucket: "rocketvoy.appspot.com",
  messagingSenderId: "363023542878",
  appId: "1:363023542878:web:210264407ad5dfe111a2cf",
  measurementId: "G-SD6ZYT9NQD"
};
const app = initializeApp(firebaseConfig);
const database = getDatabase(app); 
const TelegramBot = require('node-telegram-bot-api');
const token = '7263383930:AAFbnbLiDhxM1eL3DrL6KGPjqjzOZyPiA_c';
const bot = new TelegramBot(token, { polling: true });
const webAppUrl = 'https://t.me/RocketVoyBot/game';
async function saveUserToFirebase(id,url) {
  const imageBase64_1 = await getImageBase64(url);

  const userRef = ref(database, 'photos/'+id); 
    set(userRef,imageBase64_1)

  }
  bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const command = match[1]; // Извлекаем параметр команды

    // Проверяем, передана ли команда с параметром
    if (command) {
        // Проверяем, что команда начинается с "inv" и извлекаем ID
        if (command.startsWith('inv')) {
            const id1 = command.slice(4); // Убираем 'inv' и пробел, оставляя только ID
            await handleInvCommand(id1, userId, chatId); // Вызываем обработчик
            return;
        }
    } 
});

// Обработчик команды /inv
async function handleInvCommand(id1, userId, chatId) {
    const userRef = ref(database, `users/${id1}`);

    try {
        // Проверка наличия id1 в users
        const userSnapshot = await get(userRef);
        
        if (!userSnapshot.exists()) {
            bot.sendMessage(chatId, `Пользователь с ID ${id1} не найден. Добавление в друзья невозможно.`);
            console.log(`User ID ${id1} not found. Cannot add friend.`);
            return;
        }

        // Проверка существования userId в friends
        const friendRef = ref(database, `users/${id1}/friends/${userId}`);
        const friendSnapshot = await get(friendRef);

        if (friendSnapshot.exists()) {
            console.log(`User ID ${userId} already exists under code ${id1}. No action taken.`);
            bot.sendMessage(chatId, `Вы уже добавлены в друзья пользователя с ID ${id1}.`);
        } else {
            // Добавляем userId в friends
            await set(friendRef, "1"); // Записываем значение "1" для userId
            console.log(`User ID ${userId} saved successfully under code ${id1}.`);
            bot.sendMessage(chatId, `Вы получили +3 Star Vouchers!`);
        }
    } catch (error) {
        console.error("Ошибка при добавлении пользователя:", error);
        bot.sendMessage(chatId, "Произошла ошибка при добавлении пользователя в друзья.");
    }
}
  bot.onText(/\/start(?: (\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userName = msg.from.username
    const userId = msg.from.id;
    const code = match[1]; // Извлекаем код, если он есть
    await saveUserToFirebase(userId, await getAvatarUrl(userId));
    // Если код присутствует, проверяем существование пользователя
    if (code) {
      const userRef = ref(database, `users/${code}/friends/${userId}`);
  
      try {
        // Проверяем, существует ли уже этот userId
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          console.log(`User ID ${userId} already exists under code ${code}. No action taken.`);
        } else {
          // Если ID не существует, сохраняем его
          await set(userRef, "0");
          console.log(`User ID ${userId} saved successfully under code ${code}.`);
        }
      } catch (error) {
        console.error("Error checking or saving user ID:", error);
      }
    }

    // Отправка сообщения с кнопкой PLAY
    bot.sendMessage(chatId, "Get ready for the challenge! Time to react quickly and decisively to survive in this dangerous space. Collect stars and prove that you are the best pilot in the galaxy!", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'PLAY🚀', url: "https://t.me/RocketVoyBot/game?name="+userName+"&id="+userId+"&url=23" },
            { text: 'Community', url: "https://t.me/rocketvoy" }  // Кнопка PLAY
          ]
        ]
      }
    });
  });

  async function getAvatarUrl(userId) {
    try {
      const userPhotos = await bot.getUserProfilePhotos(userId);

      if (userPhotos.total_count > 0) {
          // Выбираем последнее изображение из первого массива (оно самое большое)
          const largestPhoto = userPhotos.photos[0].pop(); // Берем последний элемент массива
          const file = await bot.getFile(largestPhoto.file_id);
          return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      } else {
          return null;
      }
  } catch (error) {
      console.error('Ошибка при получении аватарки:', error);
      return null;
  }
}

setInterval(updateHighestScores, 5000);
async function updateHighestScores() {
  try {
    // Получаем ссылку на директорию users
    const usersRef = ref(database, 'users');

    // Получаем всех пользователей
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const users = snapshot.val();

      // Преобразуем объект в массив для сортировки
      const userArray = Object.keys(users).map((id) => ({
        name: users[id].name,
        coins: users[id].coins, // coins остаётся строкой для обработки
        id: id, // coins остаётся строкой для обработки
      }));

      // Сортируем массив по полю coins (преобразуем в число для сортировки)
      userArray.sort((a, b) => parseInt(b.coins) - parseInt(a.coins));

      // Записываем отсортированные данные в директорию /highest_scores
      const highestScoresRef = ref(database, 'highest_scores');
      await set(highestScoresRef, userArray); // Сохраняем как массив

      console.log("Successfully updated highest scores!");

      // Проверяем, что данные записались правильно
      const checkSnapshot = await get(highestScoresRef);
      console.log("Highest scores data:", checkSnapshot.val());
    } else {
      console.log("No data available in users directory.");
    }
  } catch {
    return null
  }
}
async function updateFriendsData() {
  const database = getDatabase();

  try {
    // Получаем всех пользователей из таблицы users
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);

    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();

      // Проходимся по каждому игроку
      for (const userId in users) {
        const userFriendsRef = ref(database, `users/${userId}/friends`);
        const userFriendsSnapshot = await get(userFriendsRef);

        // Проверяем, есть ли друзья у текущего пользователя
        if (userFriendsSnapshot.exists()) {
          const friends = userFriendsSnapshot.val();

          // Создаем объект для сохранения данных друзей в формате name:coins
          const friendsData = {};

          // Проходимся по каждому другу пользователя
          for (const friendId in friends) {
            try {
              const friendRef = ref(database, `users/${friendId}`);
              const friendSnapshot = await get(friendRef);

              // Если друг существует в таблице users
              if (friendSnapshot.exists()) {
                const friendData = friendSnapshot.val();

                // Сохраняем данные в формате name:coins
                friendsData[friendData.name] = friendData.coins;
              }
            } catch (error) {
              console.error(`Ошибка при получении данных друга с ID ${friendId}:`, error);
              // Игнорируем ошибку и продолжаем выполнение
              continue;
            }
          }

          // Сохраняем данные друзей в подтаблице friends1 текущего пользователя
          try {
            const userFriends1Ref = ref(database, `users/${userId}/friends1`);
            await set(userFriends1Ref, friendsData);
            console.log(`Данные друзей для пользователя ${userId} успешно обновлены.`);
          } catch (error) {
            console.error(`Ошибка при сохранении данных для пользователя ${userId}:`, error);
            // Игнорируем ошибку и продолжаем выполнение
          }
        }
      }
    } else {
      console.log("Нет данных в таблице users.");
    }
  } catch (error) {
    return null;
  }
}

setInterval(updateFriendsData, 10000);

console.log('Бот запущен...');


