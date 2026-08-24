import org.jetbrains.changelog.Changelog
import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    id("java")
    id("org.jetbrains.intellij.platform")
    id("org.jetbrains.changelog")
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencies {
    intellijPlatform {
        webstorm(providers.gradleProperty("platformVersion"))
    }
}

changelog {
    version = providers.gradleProperty("pluginVersion")
    groups.empty()
}

intellijPlatform {
    buildSearchableOptions = false
    pluginConfiguration {
        id = providers.gradleProperty("pluginId")
        name = providers.gradleProperty("pluginName")
        version = providers.gradleProperty("pluginVersion")
        changeNotes = provider {
            val item = changelog.getOrNull(project.version.toString()) ?: changelog.getLatest()
            changelog.renderItem(
                item.withHeader(true).withEmptySections(false),
                Changelog.OutputType.HTML,
            )
        }
        ideaVersion {
            sinceBuild = providers.gradleProperty("pluginSinceBuild")
            untilBuild = provider { null }
        }
    }
    publishing {
        token = providers.environmentVariable("PUBLISH_TOKEN")
    }
}

intellijPlatformTesting {
    runIde {
        register("runWebStorm") {
            type = IntelliJPlatformType.WebStorm
            version = providers.gradleProperty("platformVersion")
        }
    }
}

tasks.register<Exec>("generateThemes") {
    group = "noctis"
    description = "Regenerate Islands/Classic theme JSON, editor schemes, and plugin.xml from tools/palette.mjs"
    workingDir = layout.projectDirectory.asFile
    commandLine("node", "tools/generate.mjs")
}

tasks.register<Exec>("vendorPalette") {
    group = "noctis"
    description = "Re-extract palettes from the sibling ../noctis VS Code repo"
    workingDir = layout.projectDirectory.asFile
    commandLine("node", "tools/extract-palette.mjs")
}
