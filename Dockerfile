# ============================
# 1️⃣ Frontend (React - Vite)
# ============================
FROM node:20-alpine AS frontend-build
WORKDIR /app

COPY frontend/web/package*.json ./
RUN npm install

COPY frontend/web ./
RUN npm run build


# ============================
# 2️⃣ Backend (.NET 8)
# ============================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy entire backend first (simpler + safer)
COPY backend/ ./backend/

WORKDIR /src/backend

RUN dotnet restore UniversitySystem.Api/UniversitySystem.Api.csproj
RUN dotnet publish UniversitySystem.Api/UniversitySystem.Api.csproj -c Release -o /app/publish


# ============================
# 3️⃣ Runtime
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app

COPY --from=build /app/publish .
COPY --from=frontend-build /app/dist ./wwwroot

ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 80

ENTRYPOINT ["dotnet", "UniversitySystem.Api.dll"]