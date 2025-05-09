import mongoose from "mongoose";
import bcrypt from "bcryptjs";
// import { faker } from '@faker-js/faker';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    bio: {
      type: String,
      default: "",
    },
    profilePic: {
      type: String,
      default: "",
    },
    nativeLanguage: {
      type: String,
      default: "",
    },
    learningLanguage: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  const isPasswordCorrect = await bcrypt.compare(enteredPassword, this.password);
  return isPasswordCorrect;
};

const User = mongoose.model("User", userSchema);

export default User;


// const languages = [
//   "English", "Spanish", "French", "German", "Mandarin", "Japanese", "Korean",
//   "Hindi", "Russian", "Portuguese", "Arabic", "Italian", "Turkish", "Dutch"
// ];

// const countries = [
//   "USA", "Spain", "France", "Germany", "China", "Japan", "South Korea", "India",
//   "Russia", "Brazil", "UAE", "Italy", "Turkey", "Netherlands"
// ];

// // Generate a random user with index for password
// const createRandomUser = (index) => {
//   const nativeLang = faker.helpers.arrayElement(languages);
//   let learningLang;
//   do {
//     learningLang = faker.helpers.arrayElement(languages);
//   } while (learningLang === nativeLang);

//   return new User({
//     fullName: faker.person.fullName(),
//     email: faker.internet.email(),
//     password: `0000${index + 1}`, // Using index to create passwords 00001 to 00015
//     bio: `i am ${faker.person.jobTitle()}`,
//     profilePic: faker.image.avatar(),
//     nativeLanguage: nativeLang,
//     learningLanguage: learningLang,
//     location: faker.helpers.arrayElement(countries),
//     isOnboarded: true,
//   });
// };

// // Seed function
// const seedUsers = async () => {
//   try {
//     await User.deleteMany(); // Optional cleanup

//     for (let i = 11; i <= 35; i++) {
//       const user = createRandomUser(i); // Pass the index to the function
//       await user.save(); // bcrypt will hash password here automatically
//       console.log(` User ${i + 1} created: ${user.fullName}`);
//     }

//     console.log(' All 15 users added with realistic language and location data.');
//   } catch (err) {
//     console.error(' Error adding users:', err);
//   } finally {
//     await mongoose.disconnect();
//   }
// };

// seedUsers();