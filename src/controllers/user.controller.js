import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    return res.json(
      new ApiError(
        500,
        "Something went wrong while generating access or refresh token"
      )
    );
  }
};

const registerUser = async (req, res) => {
  try {
    // 1. extract user details
    // 2. validate fields
    // 3. check already exits
    // 4. check for image & then upload on cloudinary
    // 5. create entry in DB
    // 6. remove not necessary fields like password, refreshtoken,etc.
    // 7. check user creation whether its not undifined or null
    // 8. return user

    const { fullName, username, email, password } = req.body;
    console.log(fullName, username, email, password);

    if (
      [fullName, username, email, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      return res.json(new ApiError(400, "All fields are required"));
    }

    const existedUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existedUser) {
      return res.status(401).json(new ApiError(401, "User already existed"));
    }

    const avatarImageLocalPath = req.files?.avatar[0]?.path;

    console.log("ab", avatarImageLocalPath);

    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files?.coverImage[0]?.path;
    }
    console.log("ced", coverImageLocalPath);

    if (!avatarImageLocalPath) {
      console.log("hello");
      return res.json(new ApiError(400, "Avatar image is required"));
    }

    const avatar = await uploadOnCloudinary(avatarImageLocalPath);
    console.log("avatar", avatar.url);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
      return res.json(new ApiError(400, "Avatar image is required"));
    }

    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      return res.json(
        new ApiError(500, "something went wrong while registering user")
      );
    }
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "successfully created user"));
  } catch (error) {
    return res.json(
      new ApiError(500, error?.message || "something went wrong")
    );
  }
};

const loginUser = async (req, res) => {
  //1. req.body--->username,email,password
  //2. find user
  //3. comapre password
  //4. send tokens with cookies
  const { username, email, password } = req.body;
  if (!(username || email)) {
    return res.json(new ApiError(400, "send correct username or email"));
  }
  const findUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!findUser) {
    return res.json(new ApiError(400, "User not found"));
  }
  const isValidUser = await findUser.isPasswordCorrect(password);
  if (!isValidUser) {
    return res.json(new ApiError(400, "Invalid credentials"));
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    findUser._id
  );
  const loggedinUser = await User.findById(findUser._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedinUser, accessToken, refreshToken },
        "user loggedin successfully"
      )
    );
};

const logoutUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      { new: true }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "user logged out successfully"));
  } catch (error) {
    return res.json(new ApiError(401, "Unauthorised Access"));
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken;
    console.log(incomingRefreshToken);
    if (!incomingRefreshToken) {
      return res.status(403).json(new ApiError(403, "Unauthorised request"));
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);
    if (!user) {
      return res.status(401).json(new ApiError(403, "invalid refresh token"));
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return res
        .status(401)
        .json(new ApiError(403, "refresh token used or expired"));
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Invalid refresh Token"));
  }
};

export { registerUser, loginUser, logoutUser, refreshAccessToken };
